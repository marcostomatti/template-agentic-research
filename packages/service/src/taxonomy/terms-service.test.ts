/**
 * `src/taxonomy/terms-service.ts` — what the six term operations
 * refuse, and what they land when they do not. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * BOTH HALVES NOW, and the second one is what changed the first.
 * The mutation grid below was re-derived whole over the 125 cases
 * this file holds rather than extended with legs for the new rows:
 * every figure in a refusal-only grid moves when acceptance cases
 * land, and the sentence characterising its SHAPE moves with them.
 * It used to read that the controls were the load-bearing
 * assertions here, since not one narrowing leg reddened a case
 * named for the refusal it exercises. That is no longer true, and
 * the reason is that the controls have been replaced by cases that
 * assert what the accepted call actually wrote.
 *
 * Eleven claims.
 *
 * THAT AN ADDRESS NAMING NOTHING IS A 404 ON EVERY OPERATION, and
 * that the two addresses are told apart. A `:id` naming no category
 * and a `:id` naming no term are fixed in different places, so a
 * module answering one sentence to both would send an operator to
 * the wrong one. Each row carries its own positive control in a
 * case of its own: a service refusing everything passes every
 * assertion a refusal case makes on its own. One extra case covers
 * the path no row can — a patch that NAMES a bucket reads the term
 * through a different call than one that does not, so the 404 has
 * to be pinned on both.
 *
 * THAT A SINGLE CREATE ASSERTS A NEW ROW WHERE AN IMPORT REWRITES
 * ONE. That asymmetry is the only place two operations over one
 * table answer a duplicate differently, so the 409 is pinned beside
 * the import of the same pattern being accepted — a module
 * upserting on both paths passes the 409 case alone, and one
 * refusing on both passes every other refusal in the file. Two
 * further controls follow it: a pattern the category does not carry
 * is created, and the SAME pattern under a second category is
 * created, since the key is unique within the category rather than
 * across the table.
 *
 * THAT A DOCUMENT IS REFUSED WHOLE. Every row of the document table
 * asserts the refusal AND re-reads the category, because the claim
 * is that nothing was written rather than that something was
 * answered — a service writing the good rows and refusing the rest
 * passes every status assertion in the table. The stored rows are
 * compared against the fixture the file planted rather than against
 * emptiness, which is the stronger reading: it catches a partial
 * write and a wholesale one alike.
 *
 * THAT A ROW NAMING ANOTHER CATEGORY IS A 422 AND NOT A
 * REDIRECTION. `categoryKey` is a member of the seed shape because
 * a file is read on its own, and the path has already named the
 * bucket — so the two disagreeing is a document about something
 * else. The rows either side of it in the table are what make it
 * readable: a document whose rows all name the right category is
 * accepted, and one naming the right category twice is refused for
 * a different reason with a different code.
 *
 * THAT A BUCKET MOVE STAYS INSIDE ONE DOMAIN. This is the one rule
 * on the surface the database holds no part of — nothing relates a
 * term to a domain, so Postgres accepts the move, measured and
 * recorded in `./store.ts` — which means the case is pinning
 * behaviour that exists nowhere else. Its controls are a move
 * between two categories of one domain and a move onto the term's
 * own bucket, both accepted, and the refused move is followed by a
 * read proving the term did not go.
 *
 * THAT A BODY IS PARSED HERE, not above. Every row of the body
 * table is submitted to a SERVICE function rather than to a schema,
 * which is what says an MCP tool in wave 3 cannot be handed a
 * payload the HTTP route would have refused. All three operations
 * that take a body have rows of their own, and all three orderings
 * are pinned: a malformed body outranks a category that names
 * nothing and a term that does.
 *
 * THAT NOTHING SUBMITTED COMES BACK. The containment block counts
 * occurrences of a sentinel in the serialised refusal rather than
 * asserting absence, and takes the same count over a planted
 * envelope — a search that would find nothing anywhere reports a
 * clean refusal and a leaking one alike. This module opens one
 * channel the categories half does not: a document's faults are
 * reported per ROW, so every detail path carries an index, and the
 * rows submitting a sentinel as a `categoryKey` and as a repeated
 * pattern are what say an index is all that travels.
 *
 * THAT A CREATE LANDS THE ROW IT ANSWERED. Every row of the create
 * table is asserted twice — the answered record against a literal
 * built from the fixture, and the stored record read back through
 * {@link listTerms} against what the write answered — because a
 * create returning a row it never wrote passes the first and fails
 * the second. The three rows are the three ways `notes` arrives,
 * since an omitted note and an explicit null are ONE request here
 * and two requests one operation along.
 *
 * THAT AN IMPORT WRITES EVERY ROW AND REWRITES RATHER THAN
 * DUPLICATES. The document deliberately restates the pattern the
 * fixture planted, so one document covers both halves of an upsert:
 * two rows go in, one lands on the term that was already there and
 * keeps its id. A second import of the same three patterns with
 * every weight moved is what says a lexicon settles rather than
 * accumulating — the ids are held against the first import's, since
 * a store deleting and reinserting answers the same weights under
 * ids every caller holding one had just lost. The answered rows are
 * compared as a SET: `upsertTerms` promises no order, and pinning
 * the submitted one would assert what the port refuses to say.
 *
 * THAT A PATCH MOVES ONE MEMBER AND ONE ROW. A polarity flip and a
 * bucket move are the two edits that change what a domain scores,
 * and both are compared against the row as it was rather than
 * field by field, so a patch reaching a second member is a red case
 * rather than a plausible answer. The move is read back on BOTH
 * sides — a write that filled the new bucket without emptying the
 * old one answers exactly what the answered-row case asserts.
 *
 * THAT AN EXPORT IS THE SERIALISER'S BYTES OVER THE STORED ROWS.
 * The expectation is derived at runtime from rows read through the
 * store, so nothing in it comes back through the module under test,
 * and it is taken a second time over the SAME rows reversed —
 * which is the only case that can see the sort, since the store
 * already answers pattern order and an unsorted serialiser is
 * otherwise indistinguishable. The remaining cases cover what only
 * the module can supply: the category key stamped on every row,
 * because no term carries one.
 *
 * Mutation grid, measured over the 125 cases here with
 * `--reporter=json` and read as the failed `fullName` SET rather
 * than as a count. Twenty-three legs in two classes, because a grid
 * made of one class leaves the other half green while looking
 * thorough.
 *
 * Nineteen WIDENING legs. Rethrowing the unique refusal reddens 4 —
 * the 409, the read proving the stored term survived it, its
 * containment row and the row reading the `cause` — and answering
 * that refusal a 404 instead reddens 1, a strict subset, since the
 * containment row is blind to the status.
 *
 * Keying the foreign key on the refusal rather than on the write
 * reddens exactly 1, and the number is the finding. Four
 * operations are addressed at a category, but three of them read
 * it first and take their 404 from that read; only
 * {@link createTerm} relies on the translation, so it is the only
 * case that can see the fault. A reader expecting four here would
 * conclude the leg had missed.
 *
 * The two document rules are near-disjoint. Dropping the
 * `categoryKey` check reddens 7 and dropping the repeated-pattern
 * check reddens 4, overlapping in the single row that is wrong
 * both ways. The first of those sets reaches one case neither
 * rule's own rows explain — the cause-free row, which submits a
 * document whose only fault is its `categoryKey` and therefore
 * stops being refused at all. Reporting a document fault against
 * `body` rather than against its row reddens 4, and that set is a
 * strict subset of the union above: exactly the rows that assert
 * details, where the writes-nothing rows beside them read no
 * field path and are blind to it.
 *
 * The bucket legs split three ways. Dropping the cross-domain
 * check reddens 4, giving both bucket faults one code reddens 1,
 * and dropping `.strict()` from the create schema reddens 2.
 *
 * ONE WIDENING LEG MEASURED ZERO AND WAS RE-AIMED, which is worth
 * reporting as the pair it is. Making the absent-bucket check
 * accept instead of refuse reddens NOTHING: the foreign key
 * refuses the same write a moment later and
 * {@link refuseWrite} translates it into the identical 422, so
 * that check's whole contribution is refusing before the statement
 * runs rather than after it — the same class of unobservable
 * claim `updateCategory`'s empty-patch early return is. The
 * re-aimed leg is the null guard itself: letting a null bucket
 * fall into the cross-domain comparison reddens 1 — the same case
 * the shared-code leg reaches, and the whole of the evidence that
 * the two bucket faults are told apart.
 *
 * The leak leg reddens exactly 1: interpolating the submitted
 * pattern into the 409, with its `cause` preserved so the leg is
 * aimed at the message alone, reddens the pattern-already-carried
 * containment row and nothing else. That row plants its OWN term
 * so the pattern it submits is a sentinel — a first draft collided
 * with the fixture's planted one, counted only the note, and left
 * this leg measuring zero against a channel that was genuinely
 * open.
 *
 * ONE LEG MEASURES ZERO AND STAYS THAT WAY. Copying the
 * `StoreRefusal`'s OWN message into the 409 reddens NOTHING,
 * because the in-memory store builds its refusal from a reason and
 * a constraint name and there is no submitted content in it to
 * leak. The channel that carries one — the driver `detail` naming
 * the key and the submitted value, and the drizzle wrapper's
 * failed-query line with its bound parameters — exists only behind
 * `./db-store.ts`. So the containment rows here pin what THIS
 * module builds, their zeros rest on the planted control and on
 * the leak leg above, and the driver half is owed by the live seam.
 *
 * Six of the nineteen are aimed at the acceptance half, and their
 * sets say which claims are separable. Defaulting an omitted note
 * to the empty string reddens 3, two create rows plus one export
 * case, which is the note travelling all the way to the bytes.
 * Writing only the first row of a document reddens 7, six of the
 * document section and again one export case. Dropping `categoryId`
 * from the patch that is written reddens 3, the whole bucket-move
 * half of the patch section and nothing else.
 *
 * The two export legs are NESTED rather than independent, and
 * quoting the two counts side by side would read as two readings.
 * Stamping the category id instead of its key reddens 4; reading
 * the export through a window reddens 6, that same set plus the
 * order case and the note case. Report the nesting, not the pair.
 *
 * THE SERIALISER'S SORT IS PINNED BY ONE CASE AND NO OTHER, which
 * is the finding of the export half. Dropping the sort from
 * `./seed-format.ts` reddens exactly 1 — the case handing the same
 * rows over reversed — while the case asserting the document's
 * pattern order stays GREEN, because the store already answers
 * pattern order and an unsorted serialiser hands it straight
 * through. A file with only the order case would report a sorted
 * document and be measuring the store.
 *
 * Four NARROWING legs, and this is where the file stopped being a
 * refusal-only one. Refusing every create as a duplicate reddens
 * 111 of 125, and the SURVIVORS are the reading rather than the
 * count: every case that reaches this module's subject at all
 * plants its term through {@link createTerm}, so what is left is
 * exactly the thirteen table guards plus the planted containment
 * control — the cases that call nothing. The other three land on
 * their own sections rather than on controls alone: refusing every
 * import reddens 16, of which nine are the document section and two
 * the export round trips; answering 404 to every patch reddens 13,
 * eight of them the patch section; and answering 404 to every
 * delete still reddens 1, since nothing accepted here deletes.
 *
 * What no module mutation reaches, by construction. The thirteen
 * table guards read only the table beside them and are aimed at a
 * later edit — an operation added with no row, a document fault
 * dropped from the reason list, a body operation left uncovered,
 * a create table that stopped carrying a noted row. The planted
 * containment control is invisible for the same reason and
 * deliberately so: it proves the SEARCH, where the leak leg proves
 * the SUBJECT. The key-set guard is the third, and its value is a
 * statement `check-types` makes rather than one any leg here can
 * move: planting a member on `TermRecord` answers TS2322 at the
 * pin's own line with all 125 cases still green, measured. And no
 * leg touches `src/http/validation.ts`, so every field path in the
 * body and document tables is evidence about what this module
 * ASKED FOR rather than about how the masking is built.
 */
import type { TermSeed } from './seed-format.js';
import type { CategoryRecord, TermRecord } from './store.js';
import type { TermPage } from './terms-service.js';
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

import { serializeTermSeedDocument } from './seed-format.js';
import {
  createTerm,
  deleteTerm,
  exportTermsAsSeed,
  importTerms,
  listTerms,
  patchTerm,
} from './terms-service.js';

/** The seeded worked example, and the domain most cases store in. */
const RADAR = 'example-tech-radar';

/** A second domain, invented in the same neutral register. */
const TRANSIT = 'example-urban-transit';

/** The category every document below is addressed at. */
const LANGUAGES = 'languages';

/** A second category of {@link RADAR}, and a legal move target. */
const TOOLING = 'tooling';

/** A category of {@link TRANSIT}, and so an illegal move target. */
const MODES = 'modes';

/** An id shaped like one and carried by no row in any case here. */
const MISSING_ID = 9999;

/** The one term the fixture plants, and the pattern it carries. */
const PLANTED_PATTERN = 'rust';

/** A pattern no fixture carries, for a create that has to land. */
const FRESH_PATTERN = 'zig';

/** The window a list case asks for, already derived. */
const WHOLE_PAGE = { limit: 50, offset: 0 };

/**
 * Two domains, three categories and one term, plus the store
 * holding them.
 *
 * Three categories rather than two, because the bucket rule needs a
 * legal target and an illegal one and they have to differ in the
 * DOMAIN rather than in anything else: `tooling` and `modes` are
 * both roots holding nothing, and the only thing separating them is
 * which domain they are in.
 */
interface PlantedLexicon {
  /** The store, holding {@link RADAR} and {@link TRANSIT}. */
  readonly store: MemoryResearchStore;

  /** A category of {@link RADAR}, holding {@link planted}. */
  readonly languages: CategoryRecord;

  /** A second category of {@link RADAR}, holding nothing. */
  readonly tooling: CategoryRecord;

  /** A category of {@link TRANSIT}, holding nothing. */
  readonly modes: CategoryRecord;

  /** The one term, in {@link languages}. */
  readonly planted: TermRecord;
}

/**
 * Plants that shape.
 *
 * THE CATEGORIES GO IN THROUGH THE STORE AND THE TERM THROUGH THE
 * SERVICE, which is the split between fixture and subject. Nothing
 * in this file is a claim about `./categories-service.ts`, so
 * planting a category through it would couple two files and buy
 * nothing; the term is planted through {@link createTerm} because a
 * fixture reaching past the subject would leave the whole file
 * green against a create that refused everything.
 *
 * @returns The store and the four rows.
 */
async function plantLexicon(): Promise<PlantedLexicon> {
  const store = createMemoryResearchStore();

  await store.insertDomain({ slug: RADAR, name: 'Radar', settings: {} });
  await store.insertDomain({ slug: TRANSIT, name: 'Transit', settings: {} });

  const languages = await store.insertCategory({
    domainId: 1,
    key: LANGUAGES,
    name: 'Languages',
    parentId: null,
  });
  const tooling = await store.insertCategory({
    domainId: 1,
    key: TOOLING,
    name: 'Tooling',
    parentId: null,
  });
  const modes = await store.insertCategory({
    domainId: 2,
    key: MODES,
    name: 'Modes',
    parentId: null,
  });
  const planted = await createTerm(store, languages.id, {
    pattern: PLANTED_PATTERN,
    weight: 3,
    polarity: 'positive',
  });

  return { store, languages, tooling, modes, planted };
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
 * asserted there. {@link detailsOf} therefore reports field and
 * code alone, and the sections whose sentences are this module's
 * own assert the message separately.
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

/**
 * What one category holds right now, whole and ordered.
 *
 * Read through the store rather than through {@link listTerms}, so
 * a section claiming nothing was written is not reading its answer
 * back through the module it is making a claim about.
 *
 * @param store - Where the rows are.
 * @param categoryId - The category to read.
 * @returns Its terms, pattern ascending.
 */
async function storedTerms(
  store: MemoryResearchStore,
  categoryId: number,
): Promise<readonly TermRecord[]> {
  return store.listTerms(categoryId);
}

// ---------------------------------------------------------------------------
// An address that names nothing
// ---------------------------------------------------------------------------

/** Every function this module exports. */
const OPERATIONS = [
  'createTerm',
  'deleteTerm',
  'exportTermsAsSeed',
  'importTerms',
  'listTerms',
  'patchTerm',
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
   * Which address was wrong. Two subjects reach these six
   * operations — a `:id` that names no category, and a `:id` that
   * names no term — and a caller has to be able to tell which,
   * since the two are fixed in different places.
   */
  readonly subject: 'category' | 'term';

  /** The call that has to be refused. */
  readonly refuse: (planted: PlantedLexicon) => Promise<unknown>;

  /** The same call against an address that is there. */
  readonly control: (planted: PlantedLexicon) => Promise<unknown>;
}

/** Every operation that can be handed an address naming no row. */
const MISSING_CASES: readonly MissingCase[] = [
  {
    operation: 'listTerms',
    subject: 'category',
    refuse: ({ store }) => listTerms(store, MISSING_ID, WHOLE_PAGE),
    control: ({ store, languages }) => listTerms(
      store,
      languages.id,
      WHOLE_PAGE,
    ),
  },
  {
    operation: 'createTerm',
    subject: 'category',
    refuse: ({ store }) => createTerm(store, MISSING_ID, {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
    }),
    control: ({ store, languages }) => createTerm(store, languages.id, {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
    }),
  },
  {
    operation: 'importTerms',
    subject: 'category',
    refuse: ({ store }) => importTerms(store, MISSING_ID, { terms: [] }),
    control: ({ store, languages }) => importTerms(store, languages.id, {
      terms: [],
    }),
  },
  {
    operation: 'exportTermsAsSeed',
    subject: 'category',
    refuse: ({ store }) => exportTermsAsSeed(store, MISSING_ID),
    control: ({ store, languages }) => exportTermsAsSeed(store, languages.id),
  },
  {
    operation: 'patchTerm',
    subject: 'term',
    refuse: ({ store }) => patchTerm(store, MISSING_ID, { weight: 5 }),
    control: ({ store, planted }) => patchTerm(store, planted.id, {
      weight: 5,
    }),
  },
  {
    operation: 'deleteTerm',
    subject: 'term',
    refuse: ({ store }) => deleteTerm(store, MISSING_ID),
    control: ({ store, planted }) => deleteTerm(store, planted.id),
  },
];

describe('an address that names nothing', () => {
  it('covers every operation this module exports', () => {
    // Paired by name rather than by count, so a seventh operation
    // added to the module without a row here is this case failing
    // rather than a table that quietly covers six of seven.
    expect(MISSING_CASES.map((row) => row.operation).sort())
      .toEqual([...OPERATIONS].sort());
  });

  it('carries rows for both addresses a path can name', () => {
    expect([...new Set(MISSING_CASES.map((row) => row.subject))].sort())
      .toEqual(['category', 'term']);
  });

  for (const row of MISSING_CASES) {
    it(`answers 404 from ${row.operation}`, async () => {
      const planted = await plantLexicon();
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
      const planted = await plantLexicon();

      await expect(row.control(planted)).resolves.not.toThrow();
    });
  }

  it('says which of the two addresses was wrong', async () => {
    // The sentences themselves are not pinned — either is free to be
    // reworded — but a module answering ONE of them to both would
    // send an operator to the wrong resource, and that is.
    const planted = await plantLexicon();
    const category = await refusalFrom(
      () => exportTermsAsSeed(planted.store, MISSING_ID),
    );
    const term = await refusalFrom(
      () => deleteTerm(planted.store, MISSING_ID),
    );

    expect(category.message).not.toBe(term.message);
  });

  it('answers 404 for an unknown term a move names a bucket for', async () => {
    // A patch naming a bucket reads the term through a DIFFERENT
    // call than one that does not: the move check resolves it for
    // the domain it is currently in, where a plain patch lets the
    // update answer null. Same 404, two paths, so both are pinned.
    const { store, tooling } = await plantLexicon();
    const refusal = await refusalFrom(
      () => patchTerm(store, MISSING_ID, { categoryId: tooling.id }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });

  it('reads the term before the bucket a move names', async () => {
    // Both are wrong; the term is the one reported. A module reading
    // the bucket first would answer 422 here, which would report a
    // body member against a request whose address named nothing.
    const { store } = await plantLexicon();
    const refusal = await refusalFrom(
      () => patchTerm(store, MISSING_ID, { categoryId: MISSING_ID }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// A pattern the category already carries
// ---------------------------------------------------------------------------

describe('a pattern the category already carries', () => {
  it('translates the store refusal into a 409', async () => {
    const { store, languages } = await plantLexicon();
    const refusal = await refusalFrom(() => createTerm(store, languages.id, {
      pattern: PLANTED_PATTERN,
      weight: 9,
      polarity: 'negative',
    }));

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.code).toBe('CONFLICT');
    expect(refusal.statusCode).toBe(409);
    expect(refusal.details).toBeUndefined();
  });

  it('leaves the term the category was carrying alone', async () => {
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one answers 500 — but a translated one over a
    // store that had already written would answer 409 too. The read
    // is what separates the two.
    const { store, languages, planted } = await plantLexicon();

    await refusalFrom(() => createTerm(store, languages.id, {
      pattern: PLANTED_PATTERN,
      weight: 9,
      polarity: 'negative',
    }));

    expect(await storedTerms(store, languages.id)).toEqual([planted]);
  });

  it('creates a pattern the category does not carry', async () => {
    const { store, languages } = await plantLexicon();

    await expect(createTerm(store, languages.id, {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
    })).resolves.not.toThrow();
  });

  it('creates the same pattern under a second category', async () => {
    // The second control, and the one the first cannot stand in for:
    // the key is unique within the CATEGORY and not across the
    // table, so a service or a store holding it globally is green
    // against every other case in this file.
    const { store, tooling } = await plantLexicon();

    await expect(createTerm(store, tooling.id, {
      pattern: PLANTED_PATTERN,
      weight: 1,
      polarity: 'positive',
    })).resolves.not.toThrow();
  });

  it('imports the very pattern a create was refused for', async () => {
    // The asymmetry, and the reason both operations exist. A create
    // asserts a new row; a document is a lexicon being applied, so
    // it conflicts on the same key and rewrites what it finds. A
    // module upserting on both paths passes the 409 case above and
    // fails nothing else; one refusing on both passes every other
    // refusal in this file and fails here.
    const { store, languages } = await plantLexicon();

    await expect(importTerms(store, languages.id, {
      terms: [
        {
          categoryKey: LANGUAGES,
          pattern: PLANTED_PATTERN,
          weight: 9,
          polarity: 'negative',
          notes: null,
        },
      ],
    })).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// A document refused whole
// ---------------------------------------------------------------------------

/** One detail, as a caller reads it off a validation refusal. */
interface ExpectedDetail {
  /** The dotted field path, or the root name the parser supplies. */
  readonly field: string;

  /** The code the detail carries. */
  readonly code: string;
}

/** One document, and what {@link importTerms} answers it. */
interface DocumentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The document, unvalidated, exactly as a request carries it. */
  readonly body: unknown;

  /** Every detail the refusal has to carry, in order. */
  readonly details: readonly ExpectedDetail[];
}

/**
 * One well-formed row, for a document that needs a good entry
 * beside a bad one.
 *
 * A document whose only row is wrong cannot say whether the rest
 * would have been written, which is the whole of what the
 * refused-whole claim is about.
 */
const GOOD_ROW = {
  categoryKey: LANGUAGES,
  pattern: FRESH_PATTERN,
  weight: 1,
  polarity: 'positive',
  notes: null,
};

/**
 * The documents {@link importTerms} has to refuse.
 *
 * THREE KINDS OF FAULT, and they are three different statements
 * rather than one table. The schema answers whether each row is a
 * term at all; the category-key check answers whether the document
 * is about the bucket the path named; the repeated-pattern check
 * answers whether the document is self-consistent. Only the first
 * has anything to do with `src/http/validation.ts`, and the codes
 * say which is which.
 *
 * Every row here is submitted to a SERVICE function rather than to
 * a schema, which is the point: it is what says an MCP tool in wave
 * 3 cannot be handed a document the HTTP route would have refused.
 *
 * There is no open record on this surface, so no row carries a `*`
 * and no call below passes `openPaths`. A terms document is
 * declared members all the way down.
 */
const DOCUMENT_CASES: readonly DocumentCase[] = [
  {
    label: 'a document that is not an object',
    body: null,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a document carrying no terms member',
    body: {},
    details: [{ field: 'terms', code: 'invalid_type' }],
  },
  {
    label: 'a document carrying a key beside its terms',
    body: { terms: [], format: 'seed' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a second row naming a polarity outside the tuple',
    body: {
      terms: [GOOD_ROW, { ...GOOD_ROW, pattern: 'go', polarity: 'sideways' }],
    },
    details: [{ field: 'terms.1.polarity', code: 'invalid_value' }],
  },
  {
    label: 'a second row carrying no weight',
    body: {
      terms: [
        GOOD_ROW,
        {
          categoryKey: LANGUAGES,
          pattern: 'go',
          polarity: 'positive',
          notes: null,
        },
      ],
    },
    details: [{ field: 'terms.1.weight', code: 'invalid_type' }],
  },
  {
    label: 'a second row omitting its notes altogether',
    body: {
      terms: [
        GOOD_ROW,
        {
          categoryKey: LANGUAGES,
          pattern: 'go',
          weight: 2,
          polarity: 'positive',
        },
      ],
    },
    details: [{ field: 'terms.1.notes', code: 'invalid_type' }],
  },
  {
    label: 'a row carrying a member the seed shape does not declare',
    body: { terms: [{ ...GOOD_ROW, categoryId: 1 }] },
    details: [{ field: 'terms.0', code: 'unrecognized_keys' }],
  },
  {
    label: 'a row naming a category other than the path',
    body: {
      terms: [
        GOOD_ROW,
        { ...GOOD_ROW, categoryKey: TOOLING, pattern: 'go' },
      ],
    },
    details: [
      { field: 'terms.1.categoryKey', code: 'foreign_category_key' },
    ],
  },
  {
    label: 'every row naming a category other than the path',
    body: {
      terms: [
        { ...GOOD_ROW, categoryKey: TOOLING },
        { ...GOOD_ROW, categoryKey: MODES, pattern: 'go' },
      ],
    },
    details: [
      { field: 'terms.0.categoryKey', code: 'foreign_category_key' },
      { field: 'terms.1.categoryKey', code: 'foreign_category_key' },
    ],
  },
  {
    label: 'two rows stating one pattern',
    body: { terms: [GOOD_ROW, { ...GOOD_ROW, weight: 4 }] },
    details: [
      { field: 'terms.0.pattern', code: 'repeated_pattern' },
      { field: 'terms.1.pattern', code: 'repeated_pattern' },
    ],
  },
  {
    label: 'a row that is wrong in both the ways a row can be',
    body: {
      terms: [
        { ...GOOD_ROW, categoryKey: TOOLING },
        { ...GOOD_ROW, weight: 4 },
      ],
    },
    details: [
      { field: 'terms.0.categoryKey', code: 'foreign_category_key' },
      { field: 'terms.0.pattern', code: 'repeated_pattern' },
      { field: 'terms.1.pattern', code: 'repeated_pattern' },
    ],
  },
];

describe('a document refused whole', () => {
  it('labels every row distinctly', () => {
    const labels = DOCUMENT_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('names a distinct reason for each class of refusal', () => {
    const codes = DOCUMENT_CASES.flatMap(
      (row) => row.details.map((detail) => detail.code),
    );

    expect([...new Set(codes)].sort()).toEqual([
      'foreign_category_key',
      'invalid_type',
      'invalid_value',
      'repeated_pattern',
      'unrecognized_keys',
    ]);
  });

  it('reports a fault against the row that carried it', () => {
    // Half the rows above name an INDEX, which is the only thing a
    // detail can say about which entry was wrong without quoting
    // what it said. A module reporting every document fault against
    // `body` would answer the same status with the same code and
    // send a reader through the document by hand.
    const indexed = DOCUMENT_CASES.flatMap(
      (row) => row.details.filter((detail) => detail.field.includes('.')),
    );

    expect(indexed.length).toBeGreaterThan(0);
    expect(indexed.every((detail) => detail.field.startsWith('terms.')))
      .toBe(true);
  });

  for (const row of DOCUMENT_CASES) {
    it(`refuses ${row.label}`, async () => {
      const { store, languages } = await plantLexicon();
      const refusal = await refusalFrom(
        () => importTerms(store, languages.id, row.body),
      );

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual([...row.details]);
    });

    it(`writes nothing at all for ${row.label}`, async () => {
      // The claim the status assertion cannot make. A service
      // writing the good rows and refusing the rest answers the same
      // 422 with the same details; only the read says otherwise, and
      // it is taken against the fixture rather than against
      // emptiness so a wholesale write is caught as well.
      const { store, languages, planted } = await plantLexicon();

      await refusalFrom(() => importTerms(store, languages.id, row.body));

      expect(await storedTerms(store, languages.id)).toEqual([planted]);
    });
  }

  it('writes a document whose every row is well formed', async () => {
    // The positive control for the whole table: a module refusing
    // every document passes all eleven rows above and fails this.
    const { store, languages } = await plantLexicon();

    await expect(importTerms(store, languages.id, {
      terms: [GOOD_ROW, { ...GOOD_ROW, pattern: 'go' }],
    })).resolves.not.toThrow();
  });

  it('writes a document stating no terms at all', async () => {
    // The empty document is legal, which the port states rather than
    // leaving to its implementations, and it is the shape an export
    // of an empty category round-trips through.
    const { store, languages } = await plantLexicon();

    await expect(importTerms(store, languages.id, { terms: [] }))
      .resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// A bucket move the domains refuse
// ---------------------------------------------------------------------------

/** The code a move into another domain carries. */
const CROSS_DOMAIN_CODE = 'cross_domain_move';

/** The code a move onto a category that is not there carries. */
const UNKNOWN_BUCKET_CODE = 'unknown_bucket';

describe('a bucket move the domains refuse', () => {
  it('answers 422 naming the member the caller supplied', async () => {
    // The one rule on this surface the database holds no part of.
    // Nothing relates a term to a domain, so Postgres accepts this
    // write — measured, and recorded in `./store.ts` — which means
    // the case is pinning behaviour that exists nowhere else.
    const { store, planted, modes } = await plantLexicon();
    const refusal = await refusalFrom(
      () => patchTerm(store, planted.id, { categoryId: modes.id }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.code).toBe('VALIDATION_ERROR');
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'categoryId', code: CROSS_DOMAIN_CODE }]);
  });

  it('states the rule rather than either domain', async () => {
    // The message is this module's own claim rather than the
    // parser's, so it is asserted here rather than left to
    // `detailsOf`. Neither domain is named in it: one of the two the
    // caller never mentioned.
    const { store, planted, modes } = await plantLexicon();
    const refusal = await refusalFrom(
      () => patchTerm(store, planted.id, { categoryId: modes.id }),
    );
    const [detail] = (refusal.details ?? []) as FieldError[];

    expect(detail?.message).toBe(
      'A term moves only between categories of one domain',
    );
  });

  it('leaves the term in the bucket it was in', async () => {
    const { store, planted, modes, languages } = await plantLexicon();

    await refusalFrom(
      () => patchTerm(store, planted.id, { categoryId: modes.id }),
    );

    expect(await storedTerms(store, languages.id)).toEqual([planted]);
  });

  it('answers 422 for a bucket no category carries', async () => {
    const { store, planted } = await plantLexicon();
    const refusal = await refusalFrom(
      () => patchTerm(store, planted.id, { categoryId: MISSING_ID }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'categoryId', code: UNKNOWN_BUCKET_CODE }]);
  });

  it('tells a bucket that is elsewhere from one that is not', async () => {
    // Both refusals are 422s naming `categoryId`, so the code is
    // the whole of what separates them — a module answering one
    // code to both passes the two cases above and this one alone
    // reports it.
    expect(CROSS_DOMAIN_CODE).not.toBe(UNKNOWN_BUCKET_CODE);
  });

  it('moves a term between two categories of one domain', async () => {
    const { store, planted, tooling } = await plantLexicon();

    await expect(patchTerm(store, planted.id, { categoryId: tooling.id }))
      .resolves.not.toThrow();
  });

  it('moves a term onto the bucket it is already in', async () => {
    // Falls out of the rule rather than being excepted from it: one
    // category is trivially in one domain with itself. So a caller
    // replaying a patch it already applied is not refused.
    const { store, planted, languages } = await plantLexicon();

    await expect(patchTerm(store, planted.id, { categoryId: languages.id }))
      .resolves.not.toThrow();
  });

  it('patches a term without naming a bucket at all', async () => {
    // The path that reads nothing first. A module checking the
    // bucket rule unconditionally would refuse this, since there is
    // no `categoryId` for it to resolve.
    const { store, planted } = await plantLexicon();

    await expect(patchTerm(store, planted.id, { weight: 8 }))
      .resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// The bodies these operations refuse
// ---------------------------------------------------------------------------

/** The three operations that take a body. */
const BODY_OPERATIONS = ['create', 'import', 'patch'];

/** One body, and what the operation it was submitted to answers. */
interface BodyCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** Which operation is handed the body. */
  readonly operation: 'create' | 'import' | 'patch';

  /** The body, unvalidated, exactly as a request would carry it. */
  readonly body: unknown;

  /** Every detail the refusal has to carry, in order. */
  readonly details: readonly ExpectedDetail[];
}

/**
 * The bodies the three operations have to refuse.
 *
 * The create and patch rows are here in full; `importTerms` keeps
 * ONE row, because its own shape faults are the document table
 * above and repeating them would be the same claim written twice.
 * What its row here contributes is membership: this table is what
 * says every operation taking a body parses one, and a table
 * covering two of three would be silent about the third.
 *
 * Create and patch carry rows of their own rather than sharing
 * them. They run through one `parseBody`, so a mutation degrading
 * that function reddens both halves equally and a table driven
 * through one of them would pin only that the two share an
 * implementation — while the two schemas genuinely differ,
 * `pattern` and `weight` being required by one and optional in the
 * other.
 */
const BODY_CASES: readonly BodyCase[] = [
  {
    label: 'a create body that is not an object',
    operation: 'create',
    body: null,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a create body carrying none of the three required',
    operation: 'create',
    body: {},
    details: [
      { field: 'pattern', code: 'invalid_type' },
      { field: 'weight', code: 'invalid_type' },
      { field: 'polarity', code: 'invalid_value' },
    ],
  },
  {
    label: 'a term patterned the empty string',
    operation: 'create',
    body: { pattern: '', weight: 1, polarity: 'positive' },
    details: [{ field: 'pattern', code: 'too_small' }],
  },
  {
    // Measured under zod 4.5.1: a fractional number fails `.int()`
    // as `invalid_type` rather than as a format, so this row shares
    // its code with the one submitting no weight at all. What it
    // pins is the `.int()` call, which nothing else here reaches.
    label: 'a weight that is not a whole number',
    operation: 'create',
    body: { pattern: FRESH_PATTERN, weight: 1.5, polarity: 'positive' },
    details: [{ field: 'weight', code: 'invalid_type' }],
  },
  {
    label: 'a polarity outside the tuple the column is checked on',
    operation: 'create',
    body: { pattern: FRESH_PATTERN, weight: 1, polarity: 'sideways' },
    details: [{ field: 'polarity', code: 'invalid_value' }],
  },
  {
    label: 'a create body naming its own category',
    operation: 'create',
    body: {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
      categoryKey: LANGUAGES,
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
    label: 'a patch naming a bucket by key',
    operation: 'patch',
    body: { categoryKey: TOOLING },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch clearing the pattern to the empty string',
    operation: 'patch',
    body: { pattern: '' },
    details: [{ field: 'pattern', code: 'too_small' }],
  },
  {
    label: 'a bucket id submitted as a string',
    operation: 'patch',
    body: { categoryId: '2' },
    details: [{ field: 'categoryId', code: 'invalid_type' }],
  },
  {
    label: 'a bucket id of zero',
    operation: 'patch',
    body: { categoryId: 0 },
    details: [{ field: 'categoryId', code: 'too_small' }],
  },
  {
    label: 'a patch clearing the weight to null',
    operation: 'patch',
    body: { weight: null },
    details: [{ field: 'weight', code: 'invalid_type' }],
  },
  {
    label: 'an import body that is not an object',
    operation: 'import',
    body: 'terms',
    details: [{ field: 'body', code: 'invalid_type' }],
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
  planted: PlantedLexicon,
  row: BodyCase,
): Promise<unknown> {
  if (row.operation === 'create') {
    return createTerm(planted.store, planted.languages.id, row.body);
  }

  if (row.operation === 'import') {
    return importTerms(planted.store, planted.languages.id, row.body);
  }

  return patchTerm(planted.store, planted.planted.id, row.body);
}

describe('the bodies these operations refuse', () => {
  it('carries rows for every operation that takes one', () => {
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
      'invalid_type',
      'invalid_value',
      'too_small',
      'unrecognized_keys',
    ]);
  });

  for (const row of BODY_CASES) {
    it(`refuses ${row.label}`, async () => {
      const planted = await plantLexicon();
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
    // operation: a module refusing every body passes all thirteen
    // rows above and fails this. What it pins is that the three
    // operations take a body at all; what they LAND with one is the
    // three acceptance sections below.
    const { store, languages, planted } = await plantLexicon();
    const created = await createTerm(store, languages.id, {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
    });
    const patched = await patchTerm(store, planted.id, { weight: 8 });
    const imported = await importTerms(store, languages.id, {
      terms: [{ ...GOOD_ROW, pattern: 'go' }],
    });

    expect(created.pattern).toBe(FRESH_PATTERN);
    expect(patched.weight).toBe(8);
    expect(imported.length).toBe(1);
  });

  it('refuses a malformed create against an absent category', async () => {
    // The body is parsed before the category is reached, so the
    // same body answers the same refusal either way. A module
    // resolving first would answer this 404 and the matching row
    // above 422, which would make a caller's error depend on rows
    // it never asked about.
    const { store } = await plantLexicon();
    const refusal = await refusalFrom(
      () => createTerm(store, MISSING_ID, { pattern: '' }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([
        { field: 'pattern', code: 'too_small' },
        { field: 'weight', code: 'invalid_type' },
        { field: 'polarity', code: 'invalid_value' },
      ]);
  });

  it('refuses a malformed patch against an absent term', async () => {
    const { store } = await plantLexicon();
    const refusal = await refusalFrom(
      () => patchTerm(store, MISSING_ID, { pattern: '' }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'pattern', code: 'too_small' }]);
  });

  it('refuses a malformed document against an absent category', async () => {
    // The third ordering, and the one that costs the most to get
    // wrong: `importTerms` reads the category for its key, so a
    // module parsing after that read would answer 404 to a
    // document nobody could have written.
    const { store } = await plantLexicon();
    const refusal = await refusalFrom(
      () => importTerms(store, MISSING_ID, { terms: 'all of them' }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'terms', code: 'invalid_type' }]);
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/**
 * A pattern, submitted as one.
 *
 * Free text with spaces in it, which this surface accepts: a
 * pattern is held to non-empty and nothing more, since it carries
 * case, spaces and punctuation as the operator wrote it. A sentinel
 * a schema would have refused for its SHAPE would be testing the
 * parser rather than the containment.
 */
const SENTINEL_PATTERN = 'sentinel pattern value';

/** A submitted value, carried as the note on a row. */
const SENTINEL_NOTE = 'sentinel note value';

/** A category key, submitted as one on a document row. */
const SENTINEL_KEY = 'sentinel-key-value';

/** A key no schema here declares, submitted as one. */
const SENTINEL_MEMBER = 'sentinelMemberValue';

/**
 * The four strings the rows below submit. None is a substring of
 * another, so a count against one cannot be satisfied by another.
 */
const SENTINELS = [
  SENTINEL_PATTERN,
  SENTINEL_NOTE,
  SENTINEL_KEY,
  SENTINEL_MEMBER,
];

/** A document row carrying every sentinel a row can carry. */
const SENTINEL_ROW = {
  categoryKey: SENTINEL_KEY,
  pattern: SENTINEL_PATTERN,
  weight: 1,
  polarity: 'positive',
  notes: SENTINEL_NOTE,
};

/** One refused request, and what it submitted that must not return. */
interface ContainmentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The call, submitting the needles below. */
  readonly run: (planted: PlantedLexicon) => Promise<unknown>;

  /** The submitted strings the answer must not carry. */
  readonly needles: readonly string[];
}

/** Every channel a submitted string could come back through. */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a create against a category that is not there',
    run: ({ store }) => createTerm(store, MISSING_ID, {
      pattern: SENTINEL_PATTERN,
      weight: 1,
      polarity: 'positive',
      notes: SENTINEL_NOTE,
    }),
    needles: [SENTINEL_PATTERN, SENTINEL_NOTE],
  },
  {
    // The row plants its own term rather than colliding with the
    // fixture's, so the PATTERN it submits is a sentinel too. A row
    // colliding on `rust` would count only the note, and the channel
    // a 409 most plausibly leaks — the pattern the caller named — is
    // exactly the one it would then be silent about.
    label: 'a pattern the category already carries',
    run: async ({ store, languages }) => {
      const body = {
        pattern: SENTINEL_PATTERN,
        weight: 1,
        polarity: 'positive',
        notes: SENTINEL_NOTE,
      };

      await createTerm(store, languages.id, body);

      return createTerm(store, languages.id, body);
    },
    needles: [SENTINEL_PATTERN, SENTINEL_NOTE],
  },
  {
    label: 'an undeclared member of a create body',
    run: ({ store, languages }) => createTerm(store, languages.id, {
      pattern: SENTINEL_PATTERN,
      weight: 1,
      polarity: 'positive',
      [SENTINEL_MEMBER]: 1,
    }),
    needles: [SENTINEL_PATTERN, SENTINEL_MEMBER],
  },
  {
    label: 'a document row naming another category',
    run: ({ store, languages }) => importTerms(store, languages.id, {
      terms: [SENTINEL_ROW],
    }),
    needles: [SENTINEL_KEY, SENTINEL_PATTERN, SENTINEL_NOTE],
  },
  {
    label: 'a document stating one pattern twice',
    run: ({ store, languages }) => importTerms(store, languages.id, {
      terms: [
        { ...SENTINEL_ROW, categoryKey: LANGUAGES },
        { ...SENTINEL_ROW, categoryKey: LANGUAGES, weight: 2 },
      ],
    }),
    needles: [SENTINEL_PATTERN, SENTINEL_NOTE],
  },
  {
    label: 'an undeclared member of a document row',
    run: ({ store, languages }) => importTerms(store, languages.id, {
      terms: [{ ...SENTINEL_ROW, [SENTINEL_MEMBER]: 1 }],
    }),
    needles: [SENTINEL_KEY, SENTINEL_PATTERN, SENTINEL_MEMBER],
  },
  {
    label: 'a move into another domain',
    run: ({ store, planted, modes }) => patchTerm(store, planted.id, {
      categoryId: modes.id,
      pattern: SENTINEL_PATTERN,
      notes: SENTINEL_NOTE,
    }),
    needles: [SENTINEL_PATTERN, SENTINEL_NOTE],
  },
  {
    label: 'a patch against a term that is not there',
    run: ({ store }) => patchTerm(store, MISSING_ID, {
      pattern: SENTINEL_PATTERN,
    }),
    needles: [SENTINEL_PATTERN],
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
      message: `No category carries ${SENTINEL_KEY}`,
      details: [
        {
          field: SENTINEL_MEMBER,
          message: `${SENTINEL_PATTERN} is noted ${SENTINEL_NOTE}`,
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
      const planted = await plantLexicon();
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
    // The 409 passes the `StoreRefusal` as `cause`, which is where a
    // debugger and the error-level log line find it. `cause` is
    // non-enumerable per spec, so it reaches no serialised body —
    // and that is a property of the platform rather than of this
    // module, which is why it is measured here rather than assumed.
    const { store, languages } = await plantLexicon();
    const refusal = await refusalFrom(() => createTerm(store, languages.id, {
      pattern: PLANTED_PATTERN,
      weight: 1,
      polarity: 'positive',
      notes: SENTINEL_NOTE,
    }));

    expect(refusal.cause).toBeInstanceOf(Error);
    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'message']);
  });

  it('builds a document refusal with no cause at all', async () => {
    // The other half, and the reason it is a case rather than a
    // remark: the three document rules are this module's own, so
    // there is nothing underneath them to keep. A `cause` here would
    // mean a store had refused the document, which is exactly what
    // these checks exist to make impossible.
    const { store, languages } = await plantLexicon();
    const refusal = await refusalFrom(() => importTerms(store, languages.id, {
      terms: [SENTINEL_ROW],
    }));

    expect(refusal.cause).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// What a create lands
// ---------------------------------------------------------------------------

/**
 * The members `TermRecord` declares.
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
const TERM_KEYS = [
  'categoryId',
  'id',
  'notes',
  'pattern',
  'polarity',
  'weight',
] as const satisfies readonly (keyof TermRecord)[];

/** The two members a page carries around its rows. */
const PAGE_KEYS = [
  'rows',
  'total',
] as const satisfies readonly (keyof TermPage)[];

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
  CoversEveryKey<TermRecord, typeof TERM_KEYS>
  & CoversEveryKey<TermPage, typeof PAGE_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `TermRecord` or to `TermPage` and to neither
 * list above turns {@link EveryKeyListed} into `never`, and this
 * initializer is then a TS2322 at this line — before any case can
 * compare a record against a set that has quietly stopped describing
 * it. Read in a case below, so it is a symbol this file uses rather
 * than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link TERM_KEYS}, sorted at use rather than by hand. */
const TERM_KEY_SET: readonly string[] = [...TERM_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/**
 * Finds one answered row by the pattern it carries.
 *
 * @param rows - What a read answered.
 * @param pattern - The pattern to look for.
 * @returns The row carrying it.
 * @throws When no row does. A `find` answering `undefined` compares
 *   equal to another `undefined`, so a case reading a stored row
 *   back against a write that never landed would otherwise pass for
 *   nobody's reason.
 */
function termPatterned(
  rows: readonly TermRecord[],
  pattern: string,
): TermRecord {
  const found = rows.find((row) => row.pattern === pattern);

  if (found === undefined) {
    throw new Error('no answered row carries that pattern');
  }

  return found;
}

/** The note a create states when it states one. */
const CREATED_NOTE = 'Kept for the borrow checker';

/** One accepted create, and the note the row has to end up with. */
interface CreateCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The body, unvalidated, exactly as a request would carry it. */
  readonly body: unknown;

  /** The note the stored row has to carry afterwards. */
  readonly notes: string | null;
}

/**
 * The three shapes an accepted create arrives in.
 *
 * Two of them land the SAME row, and that is the claim rather than a
 * duplicate: an absent `notes` and an explicit `null` are ONE
 * request to {@link createTerm}, which supplies the null itself
 * where a case can reach the choice. A table carrying only the
 * omission would be green against a schema that had stopped
 * accepting the explicit null, and the two are different requests
 * one operation along — a patch reads absent as "leave the note" and
 * null as "clear it", which is the third way the member moves.
 */
const CREATE_CASES: readonly CreateCase[] = [
  {
    label: 'a term whose body left the note off',
    body: { pattern: FRESH_PATTERN, weight: 1, polarity: 'positive' },
    notes: null,
  },
  {
    label: 'a term whose body states one',
    body: {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
      notes: CREATED_NOTE,
    },
    notes: CREATED_NOTE,
  },
  {
    label: 'a term whose body nulls it outright',
    body: {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
      notes: null,
    },
    notes: null,
  },
];

describe('what a create lands', () => {
  it('holds both key sets against the types they describe', () => {
    // The runtime half of the pin above. What it asserts is not the
    // `true` — that is a constant — but that the symbol exists to be
    // read: its VALUE is the statement `check-types` makes at the
    // declaration, which is a TS2322 the moment either type grows a
    // member neither list names.
    expect(EVERY_KEY_LISTED).toBe(true);
  });

  it('labels every row distinctly', () => {
    const labels = CREATE_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('carries both a noted row and a bare one', () => {
    // The anti-vacuity guard this table exists for: three rows that
    // all landed a null note would look thorough while never storing
    // a note at all, and `notes` is the one member a create decides
    // rather than copies.
    const notes = CREATE_CASES.map((row) => row.notes);

    expect({
      noted: notes.some((note) => note !== null),
      bare: notes.some((note) => note === null),
    }).toEqual({ noted: true, bare: true });
  });

  for (const row of CREATE_CASES) {
    it(`answers ${row.label}`, async () => {
      const { store, languages } = await plantLexicon();
      const created = await createTerm(store, languages.id, row.body);

      expect(created).toStrictEqual({
        id: created.id,
        categoryId: languages.id,
        pattern: FRESH_PATTERN,
        weight: 1,
        polarity: 'positive',
        notes: row.notes,
      });

      // The id is the store's own — no body here carries one — and
      // the sorted key set beside it, since the record is the one
      // field a whole-row compare cannot pin against itself.
      expect(created.id).toBeGreaterThan(0);
      expect(Object.keys(created).sort()).toEqual([...TERM_KEY_SET]);
    });

    it(`stores ${row.label}`, async () => {
      // Read back through the OTHER operation, so the claim is about
      // what is stored rather than about what one call happened to
      // answer: a create returning a row it never wrote passes the
      // case above and fails this.
      const { store, languages } = await plantLexicon();
      const created = await createTerm(store, languages.id, row.body);
      const page = await listTerms(store, languages.id, WHOLE_PAGE);

      expect(termPatterned(page.rows, FRESH_PATTERN)).toStrictEqual(created);
    });
  }

  it('leaves the row the category was already carrying', async () => {
    // A write lands one row. The term the fixture planted is still
    // there and still says what it said, which no assertion over the
    // created row could report.
    const { store, languages, planted } = await plantLexicon();

    await createTerm(store, languages.id, {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
    });

    const page = await listTerms(store, languages.id, WHOLE_PAGE);

    expect(termPatterned(page.rows, PLANTED_PATTERN)).toStrictEqual(planted);
  });

  it('writes into the category the path addressed', async () => {
    // The `:id` reached the WRITE rather than only a lookup: a
    // create stamping another bucket answers a perfectly plausible
    // row and files it in a lexicon nobody asked for.
    const { store, languages, tooling } = await plantLexicon();

    await createTerm(store, languages.id, {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
    });

    const here = await listTerms(store, languages.id, WHOLE_PAGE);
    const there = await listTerms(store, tooling.id, WHOLE_PAGE);

    expect(here.rows.map((one) => one.pattern))
      .toEqual([PLANTED_PATTERN, FRESH_PATTERN]);
    expect(there.rows).toEqual([]);
  });

  it('counts the new row in the total a page reports', async () => {
    // `total` is a second question rather than the length of the
    // rows in hand, so a create the count never saw would leave a
    // page claiming to be the whole of a category it is not.
    const { store, languages } = await plantLexicon();

    await createTerm(store, languages.id, {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
    });

    const page = await listTerms(store, languages.id, WHOLE_PAGE);

    expect(page.total).toBe(2);
    expect(Object.keys(page).sort()).toEqual([...PAGE_KEY_SET]);
  });
});

// ---------------------------------------------------------------------------
// What a document lands
// ---------------------------------------------------------------------------

/** The note one row of the lexicon below carries. */
const IMPORTED_NOTE = 'Applied from the lexicon';

/**
 * The three rows every accepted document below states.
 *
 * ONE OF THEM IS THE PATTERN THE FIXTURE ALREADY PLANTED, which is
 * what makes this table the rewrite claim rather than three inserts:
 * a bulk import upserts on `terms_category_id_pattern_unique`, so
 * the planted row here has to land on the term {@link plantLexicon}
 * created and not beside it. The other two are new, so one document
 * covers both halves of what an upsert does.
 *
 * The three weights are distinct, which is what lets a re-import be
 * read at all: a document rewriting every weight to one value would
 * be green against a store writing any of them anywhere.
 */
const LEXICON = [
  {
    categoryKey: LANGUAGES,
    pattern: 'go',
    weight: 2,
    polarity: 'positive',
    notes: null,
  },
  {
    categoryKey: LANGUAGES,
    pattern: PLANTED_PATTERN,
    weight: 9,
    polarity: 'negative',
    notes: IMPORTED_NOTE,
  },
  {
    categoryKey: LANGUAGES,
    pattern: FRESH_PATTERN,
    weight: 1,
    polarity: 'ignore',
    notes: null,
  },
];

/** {@link LEXICON}'s patterns, as a read has to answer them. */
const LEXICON_PATTERNS = ['go', PLANTED_PATTERN, FRESH_PATTERN].sort();

/**
 * The same three patterns with every weight moved, for a second
 * import.
 *
 * A REWRITE OF THE WHOLE DOCUMENT rather than of one row, because
 * the claim is that a re-import settles rather than accumulates:
 * every row conflicts, so a store inserting on conflict leaves six
 * rows where this expects three.
 */
const REWRITTEN = LEXICON.map((row) => ({ ...row, weight: row.weight + 10 }));

/** The four members a document states about one term. */
interface StatedTerm {
  /** What the row looks for. */
  readonly pattern: string;

  /** How much a match is worth. */
  readonly weight: number;

  /** Which way it points. */
  readonly polarity: string;

  /** Why it is here, or null. */
  readonly notes: string | null;
}

/**
 * Orders two stated rows by pattern.
 *
 * @param left - One row.
 * @param right - The other.
 * @returns The usual negative, zero or positive.
 */
function byPattern(left: StatedTerm, right: StatedTerm): number {
  if (left.pattern === right.pattern) {
    return 0;
  }

  return left.pattern < right.pattern
    ? -1
    : 1;
}

/**
 * What rows state about themselves, pattern ascending.
 *
 * Neither the id nor the bucket, which are the store's to issue and
 * the path's to name: this is the half a document and a stored row
 * can be compared on directly.
 *
 * @param rows - Document rows or stored terms.
 * @returns One stated row apiece, ordered.
 */
function statedBy(rows: readonly StatedTerm[]): StatedTerm[] {
  return [...rows]
    .map((row) => ({
      pattern: row.pattern,
      weight: row.weight,
      polarity: row.polarity,
      notes: row.notes,
    }))
    .sort(byPattern);
}

describe('what a document lands', () => {
  it('writes every row the document carried', async () => {
    // Compared as a SET rather than in order: `upsertTerms` answers
    // its rows in an UNSPECIFIED order by contract, so a case
    // pinning the submitted order would assert something the port
    // deliberately refuses to promise.
    const { store, languages } = await plantLexicon();
    const imported = await importTerms(store, languages.id, {
      terms: LEXICON,
    });

    expect(imported.length).toBe(LEXICON.length);
    expect(imported.map((row) => row.pattern).sort())
      .toEqual([...LEXICON_PATTERNS]);
  });

  it('stores every row the document carried', async () => {
    // Read back through the module's own read, where the order IS
    // promised, so the claim is about the stored lexicon rather than
    // about what one call answered.
    const { store, languages } = await plantLexicon();

    await importTerms(store, languages.id, { terms: LEXICON });

    const page = await listTerms(store, languages.id, WHOLE_PAGE);

    expect(statedBy(page.rows)).toEqual(statedBy(LEXICON));
    expect(page.total).toBe(LEXICON.length);
  });

  it('answers each row whole and nothing besides', async () => {
    // The sorted key set on every answered row. A member arriving by
    // spread — a `categoryKey` carried through from the document, a
    // column nobody projected — is invisible to every field read
    // above and is exactly what this line catches.
    const { store, languages } = await plantLexicon();
    const imported = await importTerms(store, languages.id, {
      terms: LEXICON,
    });

    expect(imported.map((row) => Object.keys(row).sort()))
      .toEqual(LEXICON.map(() => [...TERM_KEY_SET]));
  });

  it('rewrites the row the category already carried', async () => {
    // The upsert, and the whole difference from a create. The
    // planted term keeps its id and takes the document's weight,
    // polarity and note — where a create asserting a new row is
    // refused for the same pattern, which the section above pins.
    const { store, languages, planted } = await plantLexicon();

    await importTerms(store, languages.id, { terms: LEXICON });

    const page = await listTerms(store, languages.id, WHOLE_PAGE);

    expect(termPatterned(page.rows, PLANTED_PATTERN)).toStrictEqual({
      id: planted.id,
      categoryId: languages.id,
      pattern: PLANTED_PATTERN,
      weight: 9,
      polarity: 'negative',
      notes: IMPORTED_NOTE,
    });
  });

  it('adds no row for a pattern it rewrote', async () => {
    // The count the case above cannot make: a rewrite that also
    // inserted would answer the same row under the same pattern and
    // leave the category one term heavier.
    const { store, languages } = await plantLexicon();

    await importTerms(store, languages.id, { terms: LEXICON });

    const page = await listTerms(store, languages.id, WHOLE_PAGE);

    expect(page.rows.map((row) => row.pattern))
      .toEqual([...LEXICON_PATTERNS]);
    expect(page.total).toBe(LEXICON.length);
  });

  it('rewrites the weights a second import states', async () => {
    // Import, then import the same three patterns with every weight
    // moved. This is what makes a lexicon a thing that can be edited
    // and applied again rather than one that can only be applied.
    const { store, languages } = await plantLexicon();

    await importTerms(store, languages.id, { terms: LEXICON });
    await importTerms(store, languages.id, { terms: REWRITTEN });

    const page = await listTerms(store, languages.id, WHOLE_PAGE);

    expect(statedBy(page.rows)).toEqual(statedBy(REWRITTEN));

    // The two documents genuinely differ, so the line above is a
    // rewrite rather than a comparison that would hold either way.
    expect(statedBy(REWRITTEN)).not.toEqual(statedBy(LEXICON));
  });

  it('keeps every id a re-import writes over', async () => {
    // The claim the weights cannot make on their own: the second
    // document lands on the SAME rows. A store deleting and
    // reinserting answers the same weights under new ids, which
    // every assertion above is green against and which would strand
    // a `terms.id` a caller was holding.
    const { store, languages } = await plantLexicon();

    await importTerms(store, languages.id, { terms: LEXICON });

    const first = await listTerms(store, languages.id, WHOLE_PAGE);

    await importTerms(store, languages.id, { terms: REWRITTEN });

    const second = await listTerms(store, languages.id, WHOLE_PAGE);

    expect(second.rows.map((row) => row.id))
      .toEqual(first.rows.map((row) => row.id));
    expect(second.total).toBe(first.total);
  });

  it('leaves another category untouched', async () => {
    // The document named one bucket and the path named the same one.
    // A write reaching the table rather than the category would fill
    // this one too, and every assertion above would still hold.
    const { store, languages, tooling } = await plantLexicon();

    await importTerms(store, languages.id, { terms: LEXICON });

    const page = await listTerms(store, tooling.id, WHOLE_PAGE);

    expect(page).toStrictEqual({ rows: [], total: 0 });
  });

  it('answers an empty list for a document stating none', async () => {
    // The empty document is legal and writes nothing, which the port
    // states rather than leaving to its implementations — and it is
    // the shape an export of an empty category round-trips through.
    const { store, languages, planted } = await plantLexicon();
    const imported = await importTerms(store, languages.id, { terms: [] });
    const page = await listTerms(store, languages.id, WHOLE_PAGE);

    expect(imported).toEqual([]);
    expect(page.rows).toEqual([planted]);
  });
});

// ---------------------------------------------------------------------------
// What a patch moves
// ---------------------------------------------------------------------------

/** The note a patched term starts out carrying. */
const STANDING_NOTE = 'Written when the term went in';

describe('what a patch moves', () => {
  it('flips the polarity and leaves the rest standing', async () => {
    // The one member whose whole job is to invert what a match is
    // worth. Everything else is compared against the row as it was,
    // so a patch reaching a second member answers a plausible term
    // and quietly changes what the domain scores.
    const { store, planted } = await plantLexicon();
    const patched = await patchTerm(store, planted.id, {
      polarity: 'negative',
    });

    expect(patched.polarity).toBe('negative');
    expect(planted.polarity).toBe('positive');
    expect(patched).toStrictEqual({ ...planted, polarity: 'negative' });
    expect(Object.keys(patched).sort()).toEqual([...TERM_KEY_SET]);
  });

  it('stores the polarity it flipped', async () => {
    // Read back through the module's own read, so the claim is about
    // the stored row rather than about what the patch answered.
    const { store, planted, languages } = await plantLexicon();

    await patchTerm(store, planted.id, { polarity: 'negative' });

    const page = await listTerms(store, languages.id, WHOLE_PAGE);

    expect(termPatterned(page.rows, PLANTED_PATTERN))
      .toStrictEqual({ ...planted, polarity: 'negative' });
  });

  it('moves the term into the bucket the patch named', async () => {
    // A bucket move is an UPDATE rather than a delete and an insert,
    // which is why the id is compared against the row as it was: a
    // move that reissued the row would answer the same pattern under
    // an id every caller holding one had just lost.
    const { store, planted, tooling } = await plantLexicon();
    const moved = await patchTerm(store, planted.id, {
      categoryId: tooling.id,
    });

    expect(moved.categoryId).toBe(tooling.id);
    expect(moved.id).toBe(planted.id);
    expect(moved).toStrictEqual({ ...planted, categoryId: tooling.id });
  });

  it('stores the move on both sides of it', async () => {
    // Two categories, one term. A move writing the new bucket
    // without leaving the old one answers exactly what the case
    // above asserts and puts the term in two lexicons at once.
    const { store, planted, languages, tooling } = await plantLexicon();

    await patchTerm(store, planted.id, { categoryId: tooling.id });

    const left = await listTerms(store, languages.id, WHOLE_PAGE);
    const arrived = await listTerms(store, tooling.id, WHOLE_PAGE);

    expect(left).toStrictEqual({ rows: [], total: 0 });
    expect(arrived.rows)
      .toEqual([{ ...planted, categoryId: tooling.id }]);
    expect(arrived.total).toBe(1);
  });

  it('frees the pattern the move took out of the bucket', async () => {
    // The natural key went with the row rather than outliving it,
    // which neither read above can say: an index keeping the entry
    // answers the same two lists and refuses this create as a
    // duplicate.
    const { store, planted, languages, tooling } = await plantLexicon();

    await patchTerm(store, planted.id, { categoryId: tooling.id });

    const created = await createTerm(store, languages.id, {
      pattern: PLANTED_PATTERN,
      weight: 1,
      polarity: 'ignore',
    });

    expect(created.pattern).toBe(PLANTED_PATTERN);

    // A new row rather than the old one back: a sequence does not
    // roll back over a row that moved.
    expect(created.id).not.toBe(planted.id);
  });

  it('clears a note by naming null', async () => {
    // Null and absent are two requests, and this is the one that
    // reaches the column. A module treating null as absent answers
    // the note it was asked to remove.
    const { store, languages } = await plantLexicon();
    const noted = await createTerm(store, languages.id, {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
      notes: STANDING_NOTE,
    });
    const patched = await patchTerm(store, noted.id, { notes: null });

    expect(noted.notes).toBe(STANDING_NOTE);
    expect(patched).toStrictEqual({ ...noted, notes: null });
  });

  it('leaves a note the patch never named alone', async () => {
    // The other half of the same three-way, and the one that says
    // the member is absent rather than nulled: a patch carrying no
    // `notes` at all writes no `notes` at all.
    const { store, languages } = await plantLexicon();
    const noted = await createTerm(store, languages.id, {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
      notes: STANDING_NOTE,
    });
    const patched = await patchTerm(store, noted.id, { weight: 8 });

    expect(patched).toStrictEqual({ ...noted, weight: 8 });
  });

  it('patches the term it named and no other', async () => {
    // The whole category read back: two terms, one weight moved. A
    // patch reaching more rows than the id it was given answers the
    // same row and is invisible to every case above.
    const { store, languages, planted } = await plantLexicon();
    const other = await createTerm(store, languages.id, {
      pattern: FRESH_PATTERN,
      weight: 1,
      polarity: 'positive',
    });

    await patchTerm(store, other.id, { weight: 8 });

    const page = await listTerms(store, languages.id, WHOLE_PAGE);

    expect(page.rows).toEqual([planted, { ...other, weight: 8 }]);
  });
});

// ---------------------------------------------------------------------------
// What an export writes
// ---------------------------------------------------------------------------

/**
 * A pattern whose capital sorts it ahead of every lowercase one.
 *
 * What makes the document's order assertable at all: a code-unit
 * compare files this first, where a case-insensitive or linguistic
 * one files it last. `./seed-format.ts` states that its comparator
 * is a plain code-unit compare precisely so two exports of the same
 * rows agree on any server, and this is the pattern that can tell
 * the two apart.
 */
const CAPITAL_PATTERN = 'Zig';

/** A third pattern, for the middle of that order. */
const MIDDLE_PATTERN = 'go';

/** The note the middle row carries, so one row states one. */
const EXPORTED_NOTE = 'Kept for the toolchain';

/** The three patterns an exported document has to carry, in order. */
const EXPORT_PATTERNS = [
  CAPITAL_PATTERN,
  MIDDLE_PATTERN,
  PLANTED_PATTERN,
];

/** What a parsed export is read back through. */
interface ParsedDocument {
  /** The rows it states. */
  readonly terms: readonly TermSeed[];
}

/**
 * The fixture plus two more terms, written in an order no read
 * answers back.
 *
 * The three go in as the planted pattern, then the capital one, then
 * the middle one — so id order, insertion order and pattern order
 * are three different orders and a document following the wrong one
 * is visible.
 *
 * @returns The planted lexicon, with `languages` holding three
 *   terms.
 */
async function plantExportable(): Promise<PlantedLexicon> {
  const planted = await plantLexicon();

  await createTerm(planted.store, planted.languages.id, {
    pattern: CAPITAL_PATTERN,
    weight: 5,
    polarity: 'negative',
    notes: null,
  });
  await createTerm(planted.store, planted.languages.id, {
    pattern: MIDDLE_PATTERN,
    weight: 2,
    polarity: 'ignore',
    notes: EXPORTED_NOTE,
  });

  return planted;
}

/**
 * Turns stored rows into the seed rows a document is built from.
 *
 * @param rows - What the store holds.
 * @param categoryKey - The key the export stamps on every row, since
 *   no term carries one: `terms` holds a `category_id`, and an id
 *   the database issued means nothing to a file.
 * @returns One seed row apiece, in the order they arrived.
 */
function seedRowsOf(
  rows: readonly TermRecord[],
  categoryKey: string,
): TermSeed[] {
  return rows.map((row) => ({
    categoryKey,
    pattern: row.pattern,
    weight: row.weight,
    polarity: row.polarity,
    notes: row.notes,
  }));
}

describe('what an export writes', () => {
  it('writes the bytes the serialiser writes for those rows', async () => {
    // The whole claim, and it is a claim about BYTES rather than
    // about a shape: indent, key order, row order and the single
    // trailing newline are each a choice `./seed-format.ts` makes,
    // and two documents compared for equality are compared on all of
    // them. The expectation is derived from the STORED rows read
    // through the store, so nothing in it comes back through the
    // module under test.
    const { store, languages } = await plantExportable();
    const stored = await storedTerms(store, languages.id);
    const text = await exportTermsAsSeed(store, languages.id);

    expect(text)
      .toBe(serializeTermSeedDocument(seedRowsOf(stored, LANGUAGES)));

    // The document was built at all: an export answering the empty
    // string would satisfy nothing here, but one answering an empty
    // document over a category holding three terms would.
    expect(stored.length).toBe(EXPORT_PATTERNS.length);
    expect(text.endsWith('\n')).toBe(true);
  });

  it('writes those bytes whatever order the rows arrive in', async () => {
    // The order is the SERIALISER's and not the store's, which is
    // what makes the round trip rest on this repository rather than
    // on the collation a deployment happens to run under. The same
    // rows handed over backwards serialise to the same bytes, and
    // the second assertion is what says the two inputs differed.
    const { store, languages } = await plantExportable();
    const stored = await storedTerms(store, languages.id);
    const reversed = [...stored].reverse();
    const text = await exportTermsAsSeed(store, languages.id);

    expect(text)
      .toBe(serializeTermSeedDocument(seedRowsOf(reversed, LANGUAGES)));
    expect(reversed.map((row) => row.pattern))
      .not.toEqual(stored.map((row) => row.pattern));
  });

  it('stamps the category key on every row it writes', async () => {
    // No term carries a `categoryKey` — the column is a
    // `category_id` — so the member is the category row's key
    // stamped on the way out, and every row of one export carries
    // the same one. That is the single-category scope which makes an
    // export of `data/terms.json`'s rows not that file.
    const { store, languages } = await plantExportable();
    const stored = await storedTerms(store, languages.id);
    const text = await exportTermsAsSeed(store, languages.id);
    const parsed = JSON.parse(text) as ParsedDocument;

    expect(parsed.terms.map((row) => row.categoryKey))
      .toEqual(EXPORT_PATTERNS.map(() => LANGUAGES));
    expect(stored.some((row) => Object.hasOwn(row, 'categoryKey')))
      .toBe(false);
  });

  it('orders the document by pattern and not by id', async () => {
    // Three orders and the document follows exactly one of them. The
    // ids are read back in document order and are deliberately NOT
    // ascending, which is what says the rows were sorted rather than
    // handed over in the order they were written.
    const { store, languages } = await plantExportable();
    const stored = await storedTerms(store, languages.id);
    const text = await exportTermsAsSeed(store, languages.id);
    const parsed = JSON.parse(text) as ParsedDocument;
    const ids = parsed.terms.map(
      (row) => termPatterned(stored, row.pattern).id,
    );

    expect(parsed.terms.map((row) => row.pattern)).toEqual(EXPORT_PATTERNS);
    expect(ids).not.toEqual([...ids].sort((left, right) => left - right));
  });

  it('carries both a stated note and a null one', async () => {
    // The anti-vacuity guard the byte comparison needs: a document
    // whose every note were null would compare equal under a
    // serialiser that dropped the member, and `JSON.stringify` drops
    // an `undefined` outright — which is the reason `notes` is
    // required AND nullable in the seed shape.
    const { store, languages } = await plantExportable();
    const text = await exportTermsAsSeed(store, languages.id);
    const parsed = JSON.parse(text) as ParsedDocument;

    expect(parsed.terms.map((row) => row.notes))
      .toEqual([null, EXPORTED_NOTE, null]);
  });

  it('writes an empty category as a document with no rows', async () => {
    // The shape the port's empty-list contract round-trips through,
    // and the one an operator meets before writing any lexicon at
    // all. An export refusing here would make an empty bucket
    // indistinguishable from a bucket that is not there.
    const { store, tooling } = await plantLexicon();
    const text = await exportTermsAsSeed(store, tooling.id);

    expect(text).toBe(serializeTermSeedDocument([]));

    await expect(importTerms(store, tooling.id, JSON.parse(text)))
      .resolves.toEqual([]);
  });

  it('writes a document its own import accepts back', async () => {
    // Export, import, export: the bytes settle rather than drifting,
    // which is the whole of what one declaration of the shape buys.
    // The import upserts on the natural key, so the second export is
    // over the same three rows and not over six.
    const { store, languages } = await plantExportable();
    const text = await exportTermsAsSeed(store, languages.id);
    const imported = await importTerms(store, languages.id, JSON.parse(text));
    const again = await exportTermsAsSeed(store, languages.id);

    expect(imported.length).toBe(EXPORT_PATTERNS.length);
    expect(again).toBe(text);
  });
});
