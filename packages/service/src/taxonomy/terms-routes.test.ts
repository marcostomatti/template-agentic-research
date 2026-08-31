/**
 * `src/taxonomy/terms-routes.ts` — what each of the four routes
 * answers, both when it refuses and when it lands: the status, the
 * envelope and the bytes each answer reaches the wire with. Driven
 * over supertest against a router built by the real factory,
 * standing on `tests/helpers/memory-research-store.ts`, so every
 * claim here is answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `terms-service.test.ts` is the
 * translation, and only the translation. That a taken pattern is a
 * `ConflictError` where a document rewrites the same row, that a
 * row naming another category is a `ValidationError` carrying that
 * row's INDEX, that a repeated pattern is refused before any write,
 * that an export is the serialiser's bytes over the stored rows —
 * those are claims about the RULES and are pinned one file over,
 * over direct calls. What no call can report is whether the rule
 * reached a caller: the status `errorHandler` or the handler chose,
 * the envelope written around it, the members that envelope
 * carried, and whether a handler swallowed a throw on the way. So
 * every case below reads a response and none of them reads a return
 * value.
 *
 * WHAT ONLY THIS LAYER CAN DECIDE AT ALL is which of the two
 * operations each doubled route ran, and five of the twenty cases
 * are about exactly that. `?format` picks between a page and a
 * document, and the body's `terms` member picks between one term
 * and a lexicon; neither discriminator exists in the service, which
 * is handed a call already made.
 *
 * TWENTY CASES IN TWO HALVES — eight refusals, then twelve
 * answers, with two of the twelve guarding the shapes the other ten
 * are held to.
 *
 * EIGHT REFUSALS, GROUPED BY WHICH PART OF THE REQUEST WAS WRONG.
 *
 * THE ADDRESS. An id naming no category is `404` on all three
 * routes that take one, and an id naming no term is `404` on both
 * that take one, each asserted against ONE shared body constant per
 * address rather than five literals that agree today: five handlers
 * are five chances to answer a missing row five different ways, and
 * this file is the only place that could report it. A `:id` segment
 * that is not an id at all is `422` naming `id` on all four routes
 * and never `404` — a `404` says the row is not there, and a
 * request that never named a row has not established that.
 *
 * THE QUERY. `?format=seed` and `?page` are two vocabularies for
 * two different answers, so a request carrying both is `422` naming
 * `query` rather than served a whole document with the window
 * dropped: a caller that sent `?page` believes it is reading a
 * page, and a document is not one. A `?format` this route does not
 * serve is the other half and answers a detail naming `format`
 * instead, which is what says the discrimination is on the member's
 * PRESENCE and its refusal on the value — had the router branched
 * on the value, `?format=json` would have fallen into the paginated
 * branch and been reported as an undeclared key.
 *
 * THE PAYLOAD. A polarity outside the three is `422` naming
 * `polarity` when one term was sent and `terms.0.polarity` when a
 * document was, which is one case rather than two: the index in
 * that path is how a caller finds the row in a hundred, and it is
 * also the only proof on the wire that the document branch ran. A
 * row naming a category other than the addressed one is `422`
 * carrying this service's own `foreign_category_key` code, not
 * zod's — no schema can raise a rule about the path.
 *
 * THE CONFLICT. A pattern the category already carries is `409`
 * with `code: 'CONFLICT'` through the single create, and `201`
 * through a DOCUMENT carrying the same pattern, asserted in one
 * body. That pair is the whole of the insert-versus-upsert
 * decision as a caller meets it, and it is unobservable anywhere
 * except at a route that has to pick between the two. The `409`
 * itself is the translation being pinned rather than merely that
 * something was thrown: `StoreRefusal` is deliberately not an
 * `AppError`, so an untranslated one answers `500`.
 *
 * TWELVE ANSWERS, AND EACH READ AS A WHOLE SHAPE.
 *
 * THE PAGE. A lexicon read is `200` carrying `data` AND `meta`,
 * which is this router's difference from the sibling categories one
 * arriving on the wire: that route applies no window and answers
 * the resource envelope, this one applies a window and owes a
 * caller the description of it. Two windows of one over the same
 * two rows are asserted beside the whole read, so a handler
 * ignoring the window and a `total` taken from the rows in hand are
 * two different red cases rather than one. A category holding no
 * terms is the same envelope with an empty `data` and a
 * `totalPages` of zero, which is what makes the `404` above a claim
 * about the BUCKET. The ORDER the rows arrive in is
 * `terms-service.test.ts`'s claim and not this file's.
 *
 * THE DOCUMENT. `?format=seed` is `200` whose body is the seed
 * document's own BYTES under `application/json` — one top-level
 * member, in neither envelope, ending in one newline. The bytes and
 * not the parsed shape is the whole of what `res.send` is doing
 * there, and it is the one assertion in this file that would notice
 * `res.json`. The expectation is `serializeTermSeedDocument`'s own
 * output over the stored rows, so what is pinned is that the route
 * forwarded those bytes unaltered; the bytes themselves are
 * `./seed-format.test.ts`'s. An empty category round-trips as a
 * document declaring no terms.
 *
 * THE RESOURCE. A single create is `201` carrying the STORED row —
 * the id is a number the request never sent, and the `categoryId`
 * is the one the path addressed. An omitted `notes` arrives as an
 * explicit `null` and a stated one as the string, which are the two
 * shapes `createTermSchema`'s one optional member leaves this
 * surface. What is STORED is a second case rather than the same
 * shape written twice: the row read back through the list equal to
 * what the create answered, and the rows it joined untouched.
 *
 * THE BULK. A document is `201` carrying `{ imported }` and not the
 * rows it wrote, because `TaxonomyStore.upsertTerms` answers in an
 * unspecified order. The count is of rows SUBMITTED: the document
 * here repeats one pattern the category already holds, so it
 * answers three over a lexicon that goes from two rows to four —
 * two numbers that only a read-back beside the answer makes
 * separately visible, and the reason `TermImportSummary` states
 * which one it is. The repeated row keeps its id and takes every
 * member the document gave it, which is what lets an export import
 * back rather than accumulating a second row counting one match
 * twice.
 *
 * THE PATCH. A patch is `200` with the row afterwards, and the
 * three requests `notes` distinguishes are asserted in one body: a
 * string replaces the note, an ABSENT member leaves it alone, and
 * an explicit `null` clears it. Absent and null are one request to
 * anything reading a body loosely, so the pair is what says the
 * router kept them apart. The pattern and the `categoryId` come
 * through untouched, which the requests named neither of.
 *
 * THE DELETE. A `204` carries no body, no text and no content type,
 * asserted as the EMPTY key set rather than left unread. The row is
 * gone, its neighbour is not, and the category still answers a
 * page: nothing hangs off a term, so this is the one delete on the
 * taxonomy surface with neither a guard nor a cascade.
 *
 * THE ROUND TRIP. The last case is the two doubled routes read as
 * one claim: `data/terms.json`'s rows for ONE of its three
 * categories, serialised, POSTed as a document and read back with
 * `?format=seed`, with the two byte strings asserted identical. It
 * is the only case here that spans two routes, and it is what the
 * two branches exist for — a lexicon an operator exports,
 * edits and applies again. Its fixture is a category holding
 * NOTHING, since a bucket with rows already in it would export them
 * beside the document's and the two strings would differ for a
 * reason about neither end.
 *
 * THE KEY SET IS ASSERTED ON EVERY ANSWER, which is the discipline
 * the positive half is built around rather than a detail of it. A
 * body carrying a store-assigned id has no whole-body literal
 * available, and a case reading fields alone is blind to every
 * member it does not name — so `keysOf` sits beside the field reads
 * on each answer, and a member arriving that nobody asserted is a
 * red case rather than a silent addition to the wire. The lists are
 * pinned in both directions: `satisfies` against the type, and
 * `EVERY_KEY_LISTED` back the other way, so a member added to
 * `TermRecord`, to a seed row, to either envelope, to `meta`, to
 * the import summary or to the document and to no list is a TS2322
 * rather than an assertion that quietly stopped describing its
 * subject.
 *
 * ANTI-VACUITY. A router that refused everything would satisfy
 * every refusal below, and one that answered a fixed body would
 * satisfy several of the answers, so each case carries its own
 * control in the same body, varied along the axis under test and
 * reached through the SAME operation: each `404` acts on the row
 * that IS stored, the not-an-id segment is paired with the id it
 * would have been, the windowed seed request is paired with BOTH
 * vocabularies sent alone, the bad format is paired with the one
 * format this route serves, each bad polarity is paired with the
 * same write carrying a legal one, the foreign row is paired with
 * the same document naming the addressed category, the duplicate
 * create is paired with a free pattern, the whole page is paired
 * with two windows of one, the empty lexicon is paired with the
 * `404` an id naming no category gets, the document read is paired
 * with the same path carrying no `?format`, the create with no note
 * is paired with one that states a note, the three-row document is
 * paired with a document declaring none, the delete that lands is
 * followed by the identical request answering `404`, and the
 * round-tripped document is paired with the seed FILE posted whole,
 * which is the same rows with the header still on them and is
 * refused `422`.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim. What a
 * refusal may CONTAIN is `terms-service.test.ts`'s at this layer
 * and `tests/api/request-echo.test.ts`'s across the surface: none
 * of the requests below submits a sentinel, because the details
 * these eight refusal paths build are made of member names, this
 * service's own sentences and a row index.
 *
 * MUTATION GRID, re-measured over all twenty cases by mutating
 * `terms-routes.ts` and reading the failed `fullName` SET from a
 * `--reporter=json` run rather than a count. Sixteen legs, and six
 * of them moved when the round trip landed — a grid is a
 * measurement over a case list, so it belongs to the file as it
 * stands rather than to the task that first wrote it. What the six
 * have in common is the shape of that case: it is the only one
 * here that spans BOTH doubled routes, so it joins the red set of
 * every leg touching either the bulk write or the seed read, and
 * of none touching the paginated one.
 *
 * THE STATUS LEGS. Answering a single create with `200` reddens
 * FOUR — the create that lands, plus the three refusals
 * whose `201` controls it breaks. Answering a bulk import with
 * `200` reddens FIVE the same way, and the two sets overlap in the
 * two cases that send both body shapes. Answering the `204` as a
 * `200` with a body reddens THREE: the delete that lands, and the
 * `204` controls of the term `404` and the not-an-id case.
 *
 * THE DISCRIMINATION LEGS, which is what this file exists for.
 * Branching on the VALUE of `?format` rather than on the member's
 * presence reddens exactly ONE, the bad-format case, and nothing
 * else in the package would report it: the request still refuses,
 * with a detail naming `query` instead of `format`. Dropping
 * `.strict()` from the seed query reddens ONE and skipping that
 * parse altogether reddens TWO, the first set inside the second, so
 * the pair reads as one narrowing rather than two legs. Treating
 * every body as a single term reddens SIX and treating every
 * object body as a document reddens FIVE; they share only the two
 * cases that send BOTH shapes in one body and differ in four and
 * three, which is the two halves of one choice measured from
 * either side. The round trip sits in the first set and not the
 * second, because a document is what it sends.
 *
 * THE ENVELOPE LEGS. Dropping the paginated envelope reddens
 * EIGHT and dropping only its `meta` reddens SEVEN, the second set
 * inside the first: the case they differ by is the patch, which
 * reads its row back through `body.data` and survives an envelope
 * that lost nothing but the window. Six of those eight are cases
 * about something else reading a list as a control. Answering the
 * seed document through `ok()` reddens THREE and answering a bulk
 * import with the rows it wrote reddens FOUR, one of which is the
 * case named for the count.
 *
 * THE BYTE LEG, which is this grid's only leg about a
 * representation rather than a shape. Answering the seed document
 * through `res.json` of its parsed form — same document,
 * different bytes — reddens TWO, and they are exactly the
 * two cases that read `res.text`: the seed read, and the round
 * trip. It reddened NOTHING while every case parsed the body, and
 * the indent, the key order and the trailing newline are what a
 * document has to keep to import back at all.
 *
 * THE ADDRESS LEGS, where the leg has to be picked to match the
 * claim. Replacing `readId` with a bare `Number(...)` reddens ONE,
 * the not-an-id case, and that is the leg that says the SCHEMA is
 * load-bearing. Taking the segment RAW reddens EIGHTEEN of twenty
 * instead — a wider leg measuring a wider fault, and
 * useful for the opposite reason: the two survivors are exactly the
 * two guard cases, which call nothing, so it is the control saying
 * every other case reaches the router at all. Skipping the list's
 * query parse for a hardcoded window reddens TWO.
 *
 * THE TWO CASES NO LEG REDDENS are those same guards, and they are
 * invisible to every module mutation by construction: one reads the
 * key-set type pin and the other the fixture table beside it.
 * Their own liveness is `check-types`, not vitest —
 * planting a member on `TermImportSummary` answered TS2322 at
 * {@link EVERY_KEY_LISTED} with all twenty cases still green.
 */
import type { TermSeed } from './seed-format.js';
import type { TermRecord } from './store.js';
import type { TermImportSummary } from './terms-routes.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type {
  PaginatedEnvelope,
  PaginationMeta,
  SuccessEnvelope,
} from '../http/envelope.js';
import type { Application } from 'express';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import {
  serializeTermSeedDocument,
  termSeedSchema,
  TermsFileSchema,
} from './seed-format.js';
import { buildTermsRouter } from './terms-routes.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('terms-routes-test', { level: 'silent' });

/**
 * The category every case plants its lexicon in, by key.
 *
 * The key matters here in a way it does not on the categories
 * router: every seed row names one in `categoryKey`, and a document
 * whose rows name {@link OTHER_KEY} instead is one of the eight
 * refusals.
 */
const STORED_KEY = 'phrases';

/** A second category in the same domain, holding no terms. */
const OTHER_KEY = 'tools';

/**
 * The one category of `data/terms.json` the round trip is scoped
 * to, which is the same one {@link withLexicon} plants under.
 *
 * That agreement is what lets the file's own rows be posted
 * UNMODIFIED: `importTerms` refuses a row naming a category other
 * than the one the path addressed, so a document's `categoryKey`
 * has to be the addressed category's key rather than whichever one
 * the document was written under.
 */
const SEED_FILE_KEY = STORED_KEY;

/** The pattern the fixture plants, and the one a create collides on. */
const STORED_PATTERN = 'alpha';

/** The second planted pattern, so a page can be narrower than a category. */
const SECOND_PATTERN = 'beta';

/** A pattern no case plants, which every control writes under. */
const FREE_PATTERN = 'gamma';

/**
 * An id no planted row carries, category or term.
 *
 * Far past the handful the fixture hands out, and a positive
 * integer so that `resourceIdParamSchema` narrows it happily — this
 * is the `404` cases' subject, and a value the schema refused would
 * answer `422` and pin the wrong thing.
 */
const ABSENT_ID = 9999;

/** A polarity `TERM_POLARITIES` does not carry. */
const BAD_POLARITY = 'sideways';

/**
 * A second unplanted pattern, for the writes that need two.
 *
 * A document carrying one new row proves nothing a single create
 * does not, so the import cases send a row under {@link
 * FREE_PATTERN} and one under this — beside a third repeating a
 * pattern the category already holds, which is what makes the count
 * a bulk import answers readable as a count of SUBMITTED rows.
 */
const SPARE_PATTERN = 'delta';

/**
 * The first row {@link withLexicon} plants, as it plants it.
 *
 * Spread into the insert rather than written out beside it, so the
 * cases below can assert a whole stored row against this constant
 * and a fixture edit cannot leave an expectation describing rows
 * nobody writes. `notes` is the null half of the pair {@link
 * SECOND_TERM} completes.
 */
const FIRST_TERM = {
  pattern: STORED_PATTERN,
  weight: 3,
  polarity: 'positive',
  notes: null,
} as const;

/** The second row {@link withLexicon} plants, and the only note in it. */
const SECOND_TERM = {
  pattern: SECOND_PATTERN,
  weight: 2,
  polarity: 'negative',
  notes: 'Why this one is here',
} as const;

/**
 * The patterns the fixture plants, in the order a read answers
 * them.
 *
 * Read by the list cases as the whole expected page and by the
 * anti-vacuity guard, which holds this list sorted against itself:
 * an ascending expectation compared against an unsorted table pins
 * the wrong order exactly as quietly as no assertion would.
 */
const PLANTED_PATTERNS: readonly string[] = [
  STORED_PATTERN,
  SECOND_PATTERN,
];

/** The weight every write body in this file sends. */
const SENT_WEIGHT = 4;

/** What a patch rewrites the weight to, and no planted row carries. */
const PATCHED_WEIGHT = 9;

/** What a patch writes into `notes`, and no planted row carries. */
const PATCHED_NOTES = 'Rewritten by a patch';

/** The weight a document rewrites {@link STORED_PATTERN} to. */
const IMPORTED_WEIGHT = 11;

/** The note a document rewrites {@link STORED_PATTERN} to. */
const IMPORTED_NOTES = 'Rewritten by a document';

/**
 * `paginationQuerySchema`'s own default, spelled here because that
 * module keeps it private.
 *
 * Read by the two list cases, which assert `meta` WHOLE: a window
 * nobody asked for is still a window a caller is told about, and
 * the number reaching the wire is the claim rather than the number
 * being a default.
 */
const DEFAULT_PER_PAGE = 50;

/**
 * The whole body a `404` about a category answers with.
 *
 * One constant asserted by three cases rather than three literals,
 * which is how this file says the three operations that address a
 * category answer ONE envelope rather than three that happen to
 * agree today. The message is
 * `src/taxonomy/terms-service.ts`'s constant; what is pinned here is
 * that it arrives unmodified with `code` beside it and nothing
 * else.
 */
const NO_SUCH_CATEGORY_BODY = {
  code: 'NOT_FOUND',
  message: 'No category carries that id',
};

/** The whole body a `404` about a term answers with. */
const NO_SUCH_TERM_BODY = {
  code: 'NOT_FOUND',
  message: 'No term carries that id',
};

/**
 * The whole body a segment that is not an id answers with.
 *
 * `invalid_type` rather than a format code, because
 * `resourceIdParamSchema` COERCES: `Number('abc')` is `NaN`, which
 * fails the integer check as a type fault and never reaches the
 * positivity one. Asserted from one constant on all four routes,
 * which share a single `readId` and would share a single mistake.
 */
const NOT_AN_ID_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'id',
    message: 'Missing, or not of the expected type.',
    code: 'invalid_type',
  }],
};

/**
 * The whole body a seed request carrying a window answers with.
 *
 * `query` and not `page`, because `seedQuerySchema` declares
 * `format` alone: a window sent beside it is an undeclared key, and
 * `src/http/validation.ts` names the CONTAINER for that issue
 * rather than the key, so nothing a caller submitted reaches the
 * detail.
 */
const UNDECLARED_QUERY_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'query',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/**
 * The whole body a `?format` this route does not serve answers
 * with.
 *
 * `format` rather than `query`, which is the difference that says
 * the router discriminated on the member's PRESENCE. A branch
 * keyed on the VALUE would have sent this request to the paginated
 * parse, where `format` is undeclared and the answer would be
 * {@link UNDECLARED_QUERY_BODY} instead — same status, different
 * detail, and a caller left looking for a typo it did not make.
 */
const BAD_FORMAT_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'format',
    message: 'Not one of the accepted values.',
    code: 'invalid_value',
  }],
};

/**
 * The whole body a pattern the category already carries answers
 * with, on the single create alone.
 *
 * No `details`: a conflict is a fact about the stored rows rather
 * than about a field, and `ConflictError` carries none unless a
 * rule has counts to report. The absence is asserted by the whole
 * body comparison rather than stated.
 */
const PATTERN_TAKEN_BODY = {
  code: 'CONFLICT',
  message: 'This category already carries a term under that pattern',
};

/** The message a `foreign_category_key` detail carries. */
const FOREIGN_KEY_RULE = 'Every row names the category the path addressed';

/**
 * The whole body a document row naming another category answers
 * with.
 *
 * The field is `terms.0.categoryKey` — the member, under the row's
 * INDEX. That index is how a caller finds the offending row in a
 * document of a hundred, and it is built from the row's position
 * rather than from anything the row said, which is what keeps a
 * submitted key out of the detail. `foreign_category_key` is this
 * service's own code and not zod's: no request schema can raise a
 * rule about the path the document was sent to.
 */
const FOREIGN_ROW_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'terms.0.categoryKey',
    message: FOREIGN_KEY_RULE,
    code: 'foreign_category_key',
  }],
};

/**
 * The whole body `data/terms.json` answers with when it is posted
 * WHOLE, header and all.
 *
 * `body` and not `_readme`: `src/http/validation.ts` names the
 * object an undeclared key was found in and never the key itself,
 * so the one member no route accepts stays out of the detail that
 * refuses it. The same answer `TermsFileSchema` gives a seed pass
 * whose loader forgot to strip the header, reached over HTTP.
 */
const SEED_FILE_HEADER_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'body',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/** The detail a polarity outside the three answers with, by field. */
function badPolarityBody(field: string): unknown {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: [{
      field,
      message: 'Not one of the accepted values.',
      code: 'invalid_value',
    }],
  };
}

/**
 * The members `TermRecord` declares, as a response carries them.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at
 * all against the drift that matters. `satisfies` closes the
 * direction where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about. The second is the direction a
 * key-set assertion exists for: a column added to the projection
 * reaches the wire unasserted otherwise, and no field read anywhere
 * in this file would notice.
 */
const TERM_KEYS = [
  'categoryId',
  'id',
  'notes',
  'pattern',
  'polarity',
  'weight',
] as const satisfies readonly (keyof TermRecord)[];

/**
 * The members a row of a seed document carries.
 *
 * NOT the record's: a document names its bucket by `categoryKey`
 * and carries no `id` and no `categoryId` at all, because an id the
 * database issued means nothing to a file. That difference is what
 * the seed case reads the two answers apart by, and it is the whole
 * reason a `?format=seed` body is not the paginated one reshaped.
 */
const SEED_ROW_KEYS = [
  'categoryKey',
  'notes',
  'pattern',
  'polarity',
  'weight',
] as const satisfies readonly (keyof TermSeed)[];

/** The members every body this router answers a resource in has. */
const RESOURCE_KEYS = [
  'data',
  'success',
] as const satisfies readonly (keyof SuccessEnvelope<unknown>)[];

/** The same members, plus the one a windowed read adds to them. */
const PAGE_KEYS = [
  ...RESOURCE_KEYS,
  'meta',
] as const satisfies readonly (keyof PaginatedEnvelope<unknown>)[];

/** The members `meta` describes the window and the collection with. */
const META_KEYS = [
  'page',
  'perPage',
  'total',
  'totalPages',
] as const satisfies readonly (keyof PaginationMeta)[];

/**
 * The members a bulk import answers instead of the rows it wrote.
 *
 * One, and the list is what says so: a summary that started
 * carrying the rows beside the count would be a member no case
 * named, and `TaxonomyStore.upsertTerms` answers in an unspecified
 * order precisely so that nothing puts them on the wire.
 */
const SUMMARY_KEYS = [
  'imported',
] as const satisfies readonly (keyof TermImportSummary)[];

/** What a seed document carries at its top level: one member. */
const DOCUMENT_KEYS = [
  'terms',
] as const satisfies readonly (keyof SeedDocument)[];

/**
 * A whole seed document, as the schema that accepts one back types
 * it.
 *
 * Taken from `TermsFileSchema` rather than restated, so a second
 * top-level member added to the seed shape is a TS2322 at
 * {@link EVERY_KEY_LISTED} rather than a member this file's key-set
 * assertion would report as an unexpected arrival on the wire.
 */
type SeedDocument = z.infer<typeof TermsFileSchema>;

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins
 * nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** Every list above, held against the type it describes. */
type EveryKeyListed =
  CoversEveryKey<TermRecord, typeof TERM_KEYS>
  & CoversEveryKey<TermSeed, typeof SEED_ROW_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>
  & CoversEveryKey<TermImportSummary, typeof SUMMARY_KEYS>
  & CoversEveryKey<SeedDocument, typeof DOCUMENT_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `TermRecord`, to a seed row, to either
 * envelope, to `meta`, to the import summary or to the document and
 * to none of the lists above turns {@link EveryKeyListed} into
 * `never`, and this initializer is then a TS2322 at this line —
 * before any case can compare a response against a set that has
 * quietly stopped describing it. Read in a case below so it is a
 * symbol this file uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link TERM_KEYS}, sorted at use rather than by hand. */
const TERM_KEY_SET: readonly string[] = [...TERM_KEYS].sort();

/** {@link SEED_ROW_KEYS}, sorted. */
const SEED_ROW_KEY_SET: readonly string[] = [...SEED_ROW_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

/** {@link SUMMARY_KEYS}, sorted. */
const SUMMARY_KEY_SET: readonly string[] = [...SUMMARY_KEYS].sort();

/** {@link DOCUMENT_KEYS}, sorted. */
const DOCUMENT_KEY_SET: readonly string[] = [...DOCUMENT_KEYS].sort();

/**
 * Just enough of an answered term for an assertion to read it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record
 * already declared in `./store.ts` — the one member the cases
 * project out of a page, and never a substitute for the key-set
 * assertion that says what the rest of the row was.
 */
interface PatternedRow {
  /** What the term matches on, and what a case finds it by. */
  readonly pattern: string;
}

/**
 * Builds an app carrying one freshly built terms router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read Express's own 500 page. What this app leaves
 * out is the framework's middleware stack and the auth guard: that
 * the routes are mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting across
 * cases would only make this file's failures depend on their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildTermsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildTermsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * One category carrying two terms, a second carrying none, and the
 * app in front of them.
 *
 * TWO CATEGORIES, because two of the eight refusals need a second
 * one to be about anything: a document row naming another category
 * has to name a category that EXISTS, or the case would be about a
 * key nobody wrote rather than about a document addressed at the
 * wrong bucket.
 *
 * TWO TERMS, because a page has to be able to be narrower than the
 * category it came out of. Both are planted through the PORT rather
 * than through `POST /categories/:id/terms`, so a case about a
 * duplicate is not also a case about the create route — and so the
 * pattern it collides on was never created successfully first.
 *
 * @returns The app, plus the ids the planted rows were given.
 */
async function withLexicon(): Promise<{
  app: Application;
  categoryId: number;
  otherId: number;
  termId: number;
}> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: 'example-tech-radar',
    name: 'Example Tech Radar',
    settings: {},
  });
  const category = await store.insertCategory({
    domainId: domain.id,
    key: STORED_KEY,
    name: 'Phrases',
    parentId: null,
  });
  const other = await store.insertCategory({
    domainId: domain.id,
    key: OTHER_KEY,
    name: 'Tools',
    parentId: null,
  });
  const term = await store.insertTerm({
    categoryId: category.id,
    ...FIRST_TERM,
  });

  await store.insertTerm({
    categoryId: category.id,
    ...SECOND_TERM,
  });

  return {
    app: buildTermsApp(store),
    categoryId: category.id,
    otherId: other.id,
    termId: term.id,
  };
}

/** The path a category's lexicon is read and written at. */
function termsPath(id: number | string): string {
  return `/categories/${id}/terms`;
}

/** The path one term is patched and deleted at. */
function termPath(id: number | string): string {
  return `/terms/${id}`;
}

/**
 * Every key of a response body, sorted.
 *
 * The `toStrictEqual` substitute at this boundary: a row's id is
 * the store's own, so a whole-body literal is unavailable for an
 * answer carrying one — while a key set catches the fault a field
 * read cannot, which is a member arriving that nobody asserted.
 *
 * @param value - The body, or a member of it.
 * @returns Its own enumerable keys, sorted. An empty list for a
 *   response that carried no body at all, which is what a `204`
 *   answers and is the claim that case makes.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
}

/**
 * The row a read carries under one pattern.
 *
 * THROWS rather than answering undefined, because the value it
 * returns is compared against another response: an absent row would
 * otherwise reach `toStrictEqual` as `undefined` and pass against
 * any other absent row, which is a green nobody wrote.
 *
 * @param rows - A read's `data`, as it came off the wire.
 * @param pattern - The pattern to find.
 * @returns The row carrying it.
 * @throws Error - When the read carries no such row.
 */
function termFor(
  rows: readonly PatternedRow[],
  pattern: string,
): PatternedRow {
  const row = rows.find((candidate) => candidate.pattern === pattern);

  if (row === undefined) {
    throw new Error(`The lexicon carries no row under ${pattern}`);
  }

  return row;
}

/**
 * The patterns a read answered, in the order it answered them.
 *
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's pattern.
 */
function patternsOf(body: { data: readonly PatternedRow[] }): string[] {
  return body.data.map((row) => row.pattern);
}

/**
 * One well-formed term, as a single-create body.
 *
 * @param overrides - What to say differently. A case naming
 *   `polarity` here is the refusal; a case naming nothing is the
 *   control beside it, which is what makes the two differ along the
 *   axis under test and nowhere else.
 * @returns The body to send.
 */
function termBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    pattern: FREE_PATTERN,
    weight: SENT_WEIGHT,
    polarity: 'positive',
    ...overrides,
  };
}

/**
 * One well-formed seed document carrying a single row.
 *
 * @param overrides - What that row says differently.
 * @returns The body to send, in the shape `data/terms.json`
 *   carries.
 */
function documentBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    terms: [{
      categoryKey: STORED_KEY,
      pattern: FREE_PATTERN,
      weight: SENT_WEIGHT,
      polarity: 'positive',
      notes: null,
      ...overrides,
    }],
  };
}

/**
 * A seed document carrying three rows: two the category does not
 * hold, and one it does.
 *
 * THE REPEAT IS THE POINT. A document is a lexicon being applied,
 * so `importTerms` upserts on the natural key — and a document made
 * only of new rows could not tell the count a bulk import answers
 * (rows SUBMITTED) from the rows the category gained. Every member
 * of the repeated row disagrees with the stored one, so the rewrite
 * is observable in the weight, the polarity and the note rather
 * than in whichever of the three happened to differ.
 *
 * @returns The body to send, in the shape `data/terms.json`
 *   carries.
 */
function seedDocument(): { terms: readonly TermSeed[] } {
  return {
    terms: [
      {
        categoryKey: STORED_KEY,
        pattern: STORED_PATTERN,
        weight: IMPORTED_WEIGHT,
        polarity: 'negative',
        notes: IMPORTED_NOTES,
      },
      {
        categoryKey: STORED_KEY,
        pattern: FREE_PATTERN,
        weight: SENT_WEIGHT,
        polarity: 'positive',
        notes: null,
      },
      {
        categoryKey: STORED_KEY,
        pattern: SPARE_PATTERN,
        weight: SENT_WEIGHT,
        polarity: 'ignore',
        notes: null,
      },
    ],
  };
}

/**
 * `data/terms.json`, at the path this file reads it from.
 *
 * The round-trip fixture below is that file's own rows rather than
 * a hand-copy of them, because the claim it makes is about THAT
 * document: a lexicon an operator already has, leaving through
 * `?format=seed` and coming back through a bulk import. A copy
 * agrees with the file until the day somebody edits one of them.
 */
const SEED_FILE_PATH = fileURLToPath(
  new URL('../../data/terms.json', import.meta.url),
);

/** That file, parsed and otherwise untouched. */
const SEED_FILE: unknown = JSON.parse(readFileSync(SEED_FILE_PATH, 'utf8'));

/**
 * Every row it carries, with its header stripped.
 *
 * A NON-strict object is the whole of the stripping: zod drops an
 * undeclared key by default, so `_readme` is gone before
 * `termSeedSchema` reads a row — which is what
 * `stripUnderscoreKeys` does for a seed pass, and the reason
 * `TermsFileSchema` itself cannot be used here at all. It is
 * strict, and the file on disk carries two top-level members.
 */
const ALL_SEED_ROWS: readonly TermSeed[] = z.object({
  terms: z.array(termSeedSchema),
}).parse(SEED_FILE).terms;

/**
 * The rows for ONE of the three categories that file spans.
 *
 * What an export is scoped to, and therefore what a document has to
 * be built from for the two ends to be comparable at all.
 */
const SEED_FILE_ROWS: readonly TermSeed[] = ALL_SEED_ROWS.filter(
  (row) => row.categoryKey === SEED_FILE_KEY,
);

/**
 * A domain carrying ONE category, keyed as `data/terms.json` names
 * one of its three, and holding no terms at all.
 *
 * A fixture of its own rather than {@link withLexicon}, and the
 * emptiness is the reason: a round trip is a claim about a document
 * that leaves and comes back, so a category already holding rows
 * would export them beside the ones the document put there and the
 * two byte strings would differ for a reason that says nothing
 * about either end.
 *
 * @returns The app, plus the id the empty category was given.
 */
async function withSeedCategory(): Promise<{
  app: Application;
  categoryId: number;
}> {
  const store = createMemoryResearchStore();
  const domain = await store.insertDomain({
    slug: 'example-tech-radar',
    name: 'Example Tech Radar',
    settings: {},
  });
  const category = await store.insertCategory({
    domainId: domain.id,
    key: SEED_FILE_KEY,
    name: 'Phrases',
    parentId: null,
  });

  return { app: buildTermsApp(store), categoryId: category.id };
}

// ---------------------------------------------------------------------------
// The address: an id naming no category, and one naming no term
// ---------------------------------------------------------------------------

describe('an id naming no category', () => {
  it('answers 404 on all three routes that take one', async () => {
    const { app, categoryId } = await withLexicon();

    const listed = await request(app).get(termsPath(ABSENT_ID));
    const exported = await request(app)
      .get(termsPath(ABSENT_ID))
      .query({ format: 'seed' });
    const created = await request(app)
      .post(termsPath(ABSENT_ID))
      .send(termBody());

    // The controls, along the axis under test and through the SAME
    // three operations: a router answering 404 to everything
    // satisfies the three assertions above on its own. They also
    // say what the 404 is FOR — a category holding no terms is a
    // 200 carrying an empty page, so only a bucket that is not
    // there answers this way.
    const okList = await request(app).get(termsPath(categoryId));
    const okSeed = await request(app)
      .get(termsPath(categoryId))
      .query({ format: 'seed' });
    const okCreate = await request(app)
      .post(termsPath(categoryId))
      .send(termBody());

    expect(listed.status).toBe(404);
    expect(listed.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
    expect(exported.status).toBe(404);
    expect(exported.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
    expect(created.status).toBe(404);
    expect(created.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
    expect(okList.status).toBe(200);
    expect(okSeed.status).toBe(200);
    expect(okCreate.status).toBe(201);
  });
});

describe('an id naming no term', () => {
  it('answers 404 on the patch and on the delete', async () => {
    const { app, termId } = await withLexicon();
    const patch = { weight: 7 };

    const patched = await request(app)
      .patch(termPath(ABSENT_ID))
      .send(patch);
    const removed = await request(app).delete(termPath(ABSENT_ID));

    // The same two requests against the term that IS stored. The
    // patch is the identical body, so the pair differs in the id
    // and nowhere else.
    const okPatch = await request(app)
      .patch(termPath(termId))
      .send(patch);
    const okDelete = await request(app).delete(termPath(termId));

    expect(patched.status).toBe(404);
    expect(patched.body).toStrictEqual(NO_SUCH_TERM_BODY);
    expect(removed.status).toBe(404);
    expect(removed.body).toStrictEqual(NO_SUCH_TERM_BODY);
    expect(okPatch.status).toBe(200);
    expect(okDelete.status).toBe(204);
  });
});

describe('a path segment that is not an id', () => {
  it('answers 422 naming the segment rather than 404', async () => {
    const { app, termId } = await withLexicon();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the two groups above
    // assert. That is the fault this case exists to separate: a 404
    // is a claim about the table, and `abc` is not an id the table
    // was ever asked about.
    const listed = await request(app).get(termsPath('abc'));
    const created = await request(app)
      .post(termsPath('abc'))
      .send(termBody());
    const patched = await request(app)
      .patch(termPath('abc'))
      .send({});
    const removed = await request(app).delete(termPath('abc'));
    const anId = await request(app).delete(termPath(termId));

    // All four routes, against ONE body constant: four handlers are
    // four chances to narrow the segment in only some of them, and
    // nothing else in this package would report the ones left raw.
    expect(listed.status).toBe(422);
    expect(listed.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(removed.status).toBe(422);
    expect(removed.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(anId.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// The query: two vocabularies for two answers, and neither mixed
// ---------------------------------------------------------------------------

describe('a seed request carrying a window', () => {
  it('answers 422 naming the query, and serves each alone', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    const withPage = await request(app)
      .get(path)
      .query({ format: 'seed', page: 2 });
    const withPerPage = await request(app)
      .get(path)
      .query({ format: 'seed', perPage: 10 });

    // BOTH vocabularies, each sent alone. Without them this case
    // would pass against a route that refused every query it was
    // given, and it is the pair that says the refusal is about the
    // COMBINATION rather than about either parameter.
    const seedAlone = await request(app)
      .get(path)
      .query({ format: 'seed' });
    const pageAlone = await request(app)
      .get(path)
      .query({ page: 2, perPage: 1 });

    expect(withPage.status).toBe(422);
    expect(withPage.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    expect(withPerPage.status).toBe(422);
    expect(withPerPage.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    // A document rather than an envelope, which is the answer the
    // window would have been silently dropped from.
    expect(seedAlone.status).toBe(200);
    expect(JSON.parse(seedAlone.text).terms).toHaveLength(2);
    expect(pageAlone.status).toBe(200);
    expect(pageAlone.body.meta.page).toBe(2);
  });
});

describe('a format this route does not serve', () => {
  it('answers 422 naming the format rather than the query', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    const wrong = await request(app)
      .get(path)
      .query({ format: 'csv' });
    const served = await request(app)
      .get(path)
      .query({ format: 'seed' });

    // `format` and not `query` is the whole reading. Had the router
    // branched on the VALUE rather than on the member's presence,
    // this request would have reached the paginated parse, where
    // `format` is an undeclared key — the same 422 the case above
    // asserts, naming the wrong half of the request.
    expect(wrong.status).toBe(422);
    expect(wrong.body).toStrictEqual(BAD_FORMAT_BODY);
    expect(served.status).toBe(200);
    expect(served.type).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// The payload: a value no polarity carries, and a row about elsewhere
// ---------------------------------------------------------------------------

describe('a polarity outside the three', () => {
  it('answers 422 naming it, by row index in a document', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    const single = await request(app)
      .post(path)
      .send(termBody({ polarity: BAD_POLARITY }));
    const document = await request(app)
      .post(path)
      .send(documentBody({ polarity: BAD_POLARITY }));

    // The same two writes, differing from the two above in the
    // polarity and nowhere else.
    const okSingle = await request(app)
      .post(path)
      .send(termBody());
    const okDocument = await request(app)
      .post(path)
      .send(documentBody({ pattern: SPARE_PATTERN }));

    // The two field paths are what say WHICH branch ran: a document
    // reports the member under its row's index, and a single term
    // reports the member alone. Nothing else on the wire
    // distinguishes the two operations this one route carries.
    expect(single.status).toBe(422);
    expect(single.body).toStrictEqual(badPolarityBody('polarity'));
    expect(document.status).toBe(422);
    expect(document.body).toStrictEqual(badPolarityBody('terms.0.polarity'));
    expect(okSingle.status).toBe(201);
    expect(okDocument.status).toBe(201);
  });
});

describe('a document row naming another category', () => {
  it('answers 422 naming the row that disagreed', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    // `OTHER_KEY` names a category that EXISTS, which is what makes
    // this a case about a document addressed at the wrong bucket
    // rather than about a key nobody wrote. Writing the row into
    // the addressed category anyway would be the service deciding
    // which of the two the caller meant.
    const foreign = await request(app)
      .post(path)
      .send(documentBody({ categoryKey: OTHER_KEY }));
    const addressed = await request(app)
      .post(path)
      .send(documentBody());

    expect(foreign.status).toBe(422);
    expect(foreign.body).toStrictEqual(FOREIGN_ROW_BODY);
    expect(addressed.status).toBe(201);
    expect(addressed.body.data.imported).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The conflict: one pattern, two operations, two answers
// ---------------------------------------------------------------------------

describe('a pattern the category already carries', () => {
  it('answers 409 on a create and 201 through a document', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    const duplicate = await request(app)
      .post(path)
      .send(termBody({ pattern: STORED_PATTERN }));

    // The same pattern through the OTHER operation the same route
    // carries. A document is a lexicon being applied, so it
    // rewrites the row it finds — which is what lets an export
    // import back rather than accumulating a second row that would
    // count the same match twice.
    const rewritten = await request(app)
      .post(path)
      .send(documentBody({ pattern: STORED_PATTERN, weight: 11 }));

    // And the create that does not collide, so the 409 above is
    // about the pattern rather than about the route refusing every
    // insert it is given.
    const free = await request(app)
      .post(path)
      .send(termBody());

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toStrictEqual(PATTERN_TAKEN_BODY);
    expect(rewritten.status).toBe(201);
    expect(rewritten.body.data.imported).toBe(1);
    expect(free.status).toBe(201);
    expect(free.body.data.pattern).toBe(FREE_PATTERN);
  });
});

// ---------------------------------------------------------------------------
// What every positive answer below is held to
// ---------------------------------------------------------------------------

describe('the shapes every positive answer is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this file
    // uses rather than one lint reports unused. A member added to
    // `TermRecord`, to a seed row, to either envelope, to `meta`,
    // to the import summary or to the document and to none of the
    // lists is a TS2322 at that declaration, before any assertion
    // below can compare a response against a set that has quietly
    // stopped describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`, which
    // is `okPage`'s stated contract and the one difference the
    // cases below read this router's two success shapes apart by.
    expect(PAGE_KEY_SET).toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // And a seed row is NOT a record: it names its bucket by the
    // key a file can carry, where the record names it by an id the
    // database issued. That one member is what the seed case reads
    // the two answers apart by.
    expect(SEED_ROW_KEY_SET).toContain('categoryKey');
    expect(TERM_KEY_SET).not.toContain('categoryKey');
  });

  it('plants distinct patterns and writes under free ones', () => {
    // Without this, a create case colliding with a planted pattern
    // would be refused 409 and read as a router fault rather than
    // as a fixture that overlapped itself — and `termFor` would
    // have two rows to choose between.
    expect(new Set(PLANTED_PATTERNS).size).toBe(PLANTED_PATTERNS.length);
    // An ascending expectation compared against an unsorted table
    // pins the wrong order just as quietly as no assertion would,
    // and the ordering claim is the one thing a list case cannot
    // borrow from anywhere else in this file.
    expect([...PLANTED_PATTERNS].sort()).toStrictEqual(PLANTED_PATTERNS);
    expect(PLANTED_PATTERNS).not.toContain(FREE_PATTERN);
    expect(PLANTED_PATTERNS).not.toContain(SPARE_PATTERN);
    expect(FREE_PATTERN).not.toBe(SPARE_PATTERN);
  });
});

// ---------------------------------------------------------------------------
// The page: one window of a lexicon, beside the meta describing it
// ---------------------------------------------------------------------------

describe('a lexicon read that lands', () => {
  it('answers one window of rows beside the meta asked for', async () => {
    const { app, categoryId, termId } = await withLexicon();
    const path = termsPath(categoryId);

    const whole = await request(app).get(path);
    // The controls, varied along the axis under test and through
    // the SAME operation: two windows of one over the same two
    // rows. A handler ignoring the window answers both rows to all
    // three calls, and a total taken from the rows in hand answers
    // 1 to each of the narrow pair. The wide read is what makes the
    // narrow ones read as narrowings OF something.
    const first = await request(app)
      .get(path)
      .query({ page: 1, perPage: 1 });
    const second = await request(app)
      .get(path)
      .query({ page: 2, perPage: 1 });

    expect(whole.status).toBe(200);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // THREE members and not two, which is this router's difference
    // from the sibling categories one arriving on the wire: this
    // list applies a window, so it carries the `meta` describing
    // one.
    expect(keysOf(whole.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(whole.body.meta)).toStrictEqual(META_KEY_SET);
    expect(whole.body.success).toBe(true);
    expect(whole.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: PLANTED_PATTERNS.length,
      totalPages: 1,
    });
    // Pattern ascending, which the fixture cannot have arranged:
    // both rows were planted in that order, so the claim this makes
    // is that the router handed back what the store gave it — the
    // ORDER itself is `terms-service.test.ts`'s.
    expect(patternsOf(whole.body)).toStrictEqual(PLANTED_PATTERNS);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of whole.body.data) {
      expect(keysOf(row)).toStrictEqual(TERM_KEY_SET);
    }
    // One row WHOLE, against the constant the fixture plants from
    // rather than against another response: a store answering every
    // read the same wrong row would satisfy any cross-response
    // compare.
    expect(termFor(whole.body.data as PatternedRow[], STORED_PATTERN))
      .toStrictEqual({ id: termId, categoryId, ...FIRST_TERM });
    // The two windows are disjoint and each names the total of the
    // COLLECTION, which no page could have counted from its rows.
    expect(patternsOf(first.body)).toStrictEqual([STORED_PATTERN]);
    expect(patternsOf(second.body)).toStrictEqual([SECOND_PATTERN]);
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: PLANTED_PATTERNS.length,
      totalPages: PLANTED_PATTERNS.length,
    });
    expect(second.body.meta).toStrictEqual({
      page: 2,
      perPage: 1,
      total: PLANTED_PATTERNS.length,
      totalPages: PLANTED_PATTERNS.length,
    });
  });

  it('answers an empty category 200 rather than 404', async () => {
    const { app, otherId } = await withLexicon();

    const empty = await request(app).get(termsPath(otherId));
    // The control, varied along the axis this case is about — is
    // the CATEGORY there — and the other half of the pair the
    // address group opens: an id naming no category is the 404, and
    // this is what makes that 404 a claim about the bucket rather
    // than about its lexicon being unwritten.
    const missing = await request(app).get(termsPath(ABSENT_ID));

    expect(empty.status).toBe(200);
    // The envelope does not change shape when there is nothing to
    // carry, which is what makes an empty lexicon a lexicon.
    expect(keysOf(empty.body)).toStrictEqual(PAGE_KEY_SET);
    expect(empty.body.data).toStrictEqual([]);
    // `meta` describes the COLLECTION, so an empty one is a
    // `totalPages` of zero beside the window that was asked for,
    // and not the 1 an empty page would round up to.
    expect(empty.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: 0,
      totalPages: 0,
    });
    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_CATEGORY_BODY);
  });
});

// ---------------------------------------------------------------------------
// The document: the same category, answered as bytes rather than a page
// ---------------------------------------------------------------------------

describe('a seed read that lands', () => {
  it('answers the document bytes rather than an envelope', async () => {
    const { app, categoryId, otherId } = await withLexicon();
    const path = termsPath(categoryId);

    const exported = await request(app)
      .get(path)
      .query({ format: 'seed' });
    // The control, along the axis under test and through the SAME
    // route: the identical path with no `?format` answers the
    // paginated envelope. The pair is what says the parameter
    // PICKED an operation, rather than the route answering one
    // shape to everybody.
    const paged = await request(app).get(path);
    // And the empty category, which round-trips as a document
    // declaring no terms rather than as a 404 or as no body: the
    // shape an export of an empty bucket has to import back
    // through.
    const emptied = await request(app)
      .get(termsPath(otherId))
      .query({ format: 'seed' });

    expect(exported.status).toBe(200);
    expect(exported.type).toBe('application/json');
    // NEITHER envelope, asserted as the key set: one member, and it
    // is the document's own. A body carrying `success` here would
    // be a page wearing a document's content type.
    expect(keysOf(exported.body)).toStrictEqual(DOCUMENT_KEY_SET);
    expect(keysOf(paged.body)).toStrictEqual(PAGE_KEY_SET);
    // THE BYTES AND NOT THE PARSED SHAPE, which is the whole of
    // what `res.send` is doing on this branch: `res.json` would
    // answer the same document with no indent, no trailing newline
    // and its keys in whatever order the object carried them, and
    // every assertion in this file over a PARSED body would stay
    // green. The expectation is the serialiser's own output, so
    // what is pinned here is that the route forwarded those bytes
    // unaltered — the bytes themselves are `./seed-format.test.ts`'s
    // claim, and a document that survives the whole round trip is
    // the last case in this file.
    expect(exported.text).toBe(serializeTermSeedDocument([
      { categoryKey: STORED_KEY, ...FIRST_TERM },
      { categoryKey: STORED_KEY, ...SECOND_TERM },
    ]));
    // Every row names the category the PATH addressed, stamped from
    // the category row rather than carried on any term: `terms`
    // holds a `category_id`, and an id the database issued means
    // nothing to a file.
    for (const row of exported.body.terms) {
      expect(keysOf(row)).toStrictEqual(SEED_ROW_KEY_SET);
      expect(row.categoryKey).toBe(STORED_KEY);
    }
    expect(emptied.status).toBe(200);
    expect(emptied.text).toBe(serializeTermSeedDocument([]));
  });
});

// ---------------------------------------------------------------------------
// The resource: one term added, and the row the store answered
// ---------------------------------------------------------------------------

describe('a create that lands', () => {
  it('answers 201 carrying the stored row, not the request', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    const created = await request(app)
      .post(path)
      .send(termBody());
    // The control, along the axis under test and through the SAME
    // operation: the identical write NAMING a note. `notes` is the
    // one member `createTermSchema` leaves optional, so absent and
    // stated are the two shapes it lets through — and without the
    // pair the null below is equally green against a handler that
    // drops whatever note it is given.
    const noted = await request(app)
      .post(path)
      .send(termBody({ pattern: SPARE_PATTERN, notes: PATCHED_NOTES }));

    expect(created.status).toBe(201);
    expect(noted.status).toBe(201);
    // Two members and not three on both: a create answers one
    // resource, and there is no window for a `meta` to describe.
    expect(keysOf(created.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(noted.body)).toStrictEqual(RESOURCE_KEY_SET);
    // The record and NOT a seed row: a created term is addressed by
    // the id this answer carries, and `categoryKey` is a file's way
    // of naming a bucket rather than an API's.
    expect(keysOf(created.body.data)).toStrictEqual(TERM_KEY_SET);
    expect(keysOf(noted.body.data)).toStrictEqual(TERM_KEY_SET);
    expect(created.body.success).toBe(true);
    expect(created.body.data.pattern).toBe(FREE_PATTERN);
    expect(created.body.data.weight).toBe(SENT_WEIGHT);
    expect(created.body.data.polarity).toBe('positive');
    // An explicit null on the wire, and the service's own rather
    // than the request's: the body named no note at all, and an
    // absent member would have reached the caller as no member —
    // `JSON.stringify` drops an `undefined` outright, so the key
    // set above is what says the difference survived.
    expect(created.body.data.notes).toBeNull();
    expect(noted.body.data.notes).toBe(PATCHED_NOTES);
    // Neither member is on either request body, so both arriving
    // right is the STORE having answered rather than the request
    // having been echoed back under a 201.
    expect(typeof created.body.data.id).toBe('number');
    expect(created.body.data.categoryId).toBe(categoryId);
    expect(noted.body.data.categoryId).toBe(categoryId);
    expect(created.body.data.id).not.toBe(noted.body.data.id);
  });

  it('stores it, and leaves the two it joined alone', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what a call happened to
    // answer: a create returning a row it never wrote passes the
    // case above and fails this one.
    const { app, categoryId, termId } = await withLexicon();
    const path = termsPath(categoryId);

    const created = await request(app)
      .post(path)
      .send(termBody());
    const listed = await request(app).get(path);
    const rows = listed.body.data as PatternedRow[];
    const expected = [...PLANTED_PATTERNS, FREE_PATTERN];

    expect(listed.status).toBe(200);
    // The whole lexicon, so a create reaching more rows than the
    // one it wrote is a red case here rather than an answer nobody
    // compared against anything.
    expect(patternsOf(listed.body)).toStrictEqual(expected);
    expect(listed.body.meta.total).toBe(expected.length);
    expect(termFor(rows, FREE_PATTERN)).toStrictEqual(created.body.data);
    // And the row that was already there still carries what it
    // carried, which no assertion over a created row could say: a
    // create lands ONE row. A whole-row literal rather than a field
    // read, since the fault worth catching here is a neighbour
    // gaining a member or losing one on the way past a write.
    expect(termFor(rows, STORED_PATTERN))
      .toStrictEqual({ id: termId, categoryId, ...FIRST_TERM });
  });
});

// ---------------------------------------------------------------------------
// The bulk: a lexicon applied, and the count that is not a row count
// ---------------------------------------------------------------------------

describe('a document that lands', () => {
  it('answers 201 with the count of rows it wrote', async () => {
    const { app, categoryId } = await withLexicon();
    const path = termsPath(categoryId);

    const imported = await request(app)
      .post(path)
      .send(seedDocument());
    // The control, along the axis under test and through the SAME
    // operation: a document declaring no terms. It is a legal
    // lexicon rather than a malformed one — the shape an export of
    // an empty category round-trips through — and without it the
    // count below is equally green against a handler answering a
    // fixed number.
    const empty = await request(app)
      .post(path)
      .send({ terms: [] });

    expect(imported.status).toBe(201);
    expect(empty.status).toBe(201);
    // A summary and NOT the rows: `TaxonomyStore.upsertTerms`
    // answers in an unspecified order, so the rows a caller would
    // line up against its own document are one read away rather
    // than on this response.
    expect(keysOf(imported.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(imported.body.data)).toStrictEqual(SUMMARY_KEY_SET);
    expect(imported.body.success).toBe(true);
    // THE COUNT OF ROWS SUBMITTED, and not of rows the category
    // gained: one of the three repeats a pattern already stored and
    // is rewritten rather than skipped, so the lexicon goes from
    // two rows to four while this answers three. The case beside
    // this one is what makes those two numbers separately visible;
    // a caller reading this as a count of new terms is reading it
    // wrong, which is why `TermImportSummary` says so.
    expect(imported.body.data.imported).toBe(seedDocument().terms.length);
    expect(empty.body.data.imported).toBe(0);
  });

  it('stores every row, rewriting the one it repeated', async () => {
    const { app, categoryId, termId } = await withLexicon();
    const path = termsPath(categoryId);

    // Read BEFORE the write, so the row the document never named
    // can be compared against what it actually was rather than
    // against a literal restating the fixture.
    const before = await request(app).get(path);

    await request(app)
      .post(path)
      .send(seedDocument());

    const after = await request(app).get(path);
    const rows = after.body.data as PatternedRow[];
    const expected = [
      ...PLANTED_PATTERNS,
      FREE_PATTERN,
      SPARE_PATTERN,
    ].sort();

    expect(after.status).toBe(200);
    // FOUR rows out of a three-row document over a two-row lexicon,
    // which is the upsert reaching the wire: two of the three are
    // new and the third found its row.
    expect(patternsOf(after.body)).toStrictEqual(expected);
    expect(after.body.meta.total).toBe(expected.length);
    // The repeated row kept its ID and took the document's values,
    // which is what lets an export import back rather than
    // accumulating a second row that would count one match twice.
    // Every member differs from the stored one, so a rewrite that
    // reached only some of them is a red case rather than a partial
    // green.
    expect(termFor(rows, STORED_PATTERN)).toStrictEqual({
      id: termId,
      categoryId,
      pattern: STORED_PATTERN,
      weight: IMPORTED_WEIGHT,
      polarity: 'negative',
      notes: IMPORTED_NOTES,
    });
    // And the row the document never named is untouched, compared
    // against the read taken before the write. `termFor` throws on
    // an absent row, so this cannot be two undefined values
    // agreeing.
    expect(termFor(rows, SECOND_PATTERN)).toStrictEqual(
      termFor(before.body.data as PatternedRow[], SECOND_PATTERN),
    );
  });
});

// ---------------------------------------------------------------------------
// The patch: the three requests one optional member tells apart
// ---------------------------------------------------------------------------

describe('a patch that lands', () => {
  it('answers 200 with the row the patch left behind', async () => {
    const { app, categoryId, termId } = await withLexicon();

    const flipped = await request(app)
      .patch(termPath(termId))
      .send({ polarity: 'negative', weight: PATCHED_WEIGHT });
    // The first control: a member the patch does not name is left
    // alone. Without it the case is equally green against a handler
    // rewriting every column on every patch.
    const noted = await request(app)
      .patch(termPath(termId))
      .send({ notes: PATCHED_NOTES });
    // The second: an explicit `null` clears the note. Absent and
    // null are ONE request to anything reading a body loosely, and
    // this is the pair that says the router kept them apart.
    const cleared = await request(app)
      .patch(termPath(termId))
      .send({ notes: null });
    const listed = await request(app).get(termsPath(categoryId));

    expect(flipped.status).toBe(200);
    expect(keysOf(flipped.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(flipped.body.data)).toStrictEqual(TERM_KEY_SET);
    expect(flipped.body.success).toBe(true);
    expect(flipped.body.data.polarity).toBe('negative');
    expect(flipped.body.data.weight).toBe(PATCHED_WEIGHT);
    // The pattern and the bucket came through untouched, and the
    // request named neither — asserted because a re-pattern or a
    // silent move would leave every other field read here green.
    expect(flipped.body.data.pattern).toBe(STORED_PATTERN);
    expect(flipped.body.data.categoryId).toBe(categoryId);
    expect(flipped.body.data.id).toBe(termId);
    expect(noted.status).toBe(200);
    expect(noted.body.data.notes).toBe(PATCHED_NOTES);
    // The flip is still there under a patch that never named it.
    expect(noted.body.data.polarity).toBe('negative');
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.notes).toBeNull();
    // And the store holds what the last patch answered, read back
    // through the OTHER operation: a patch answering a row it never
    // wrote satisfies every assertion above.
    expect(termFor(listed.body.data as PatternedRow[], STORED_PATTERN))
      .toStrictEqual({
        id: termId,
        categoryId,
        pattern: STORED_PATTERN,
        weight: PATCHED_WEIGHT,
        polarity: 'negative',
        notes: null,
      });
  });
});

// ---------------------------------------------------------------------------
// The delete: what a 204 carries, and what it leaves behind
// ---------------------------------------------------------------------------

describe('a delete that lands', () => {
  it('answers 204 with nothing at all, and takes the row', async () => {
    const { app, categoryId, termId } = await withLexicon();

    const removed = await request(app).delete(termPath(termId));
    const listed = await request(app).get(termsPath(categoryId));
    // The control, through the SAME operation: the identical
    // request against an id that named a row a moment ago is a 404,
    // which is what makes the 204 above a delete rather than what
    // this route answers to any id it is handed.
    const again = await request(app).delete(termPath(termId));

    expect(removed.status).toBe(204);
    // An EMPTY key set, which is this route's half of the shape the
    // rest of the file reads: a deleted resource has no
    // representation, so what is asserted is that NOTHING travelled
    // rather than that some envelope did.
    expect(keysOf(removed.body)).toStrictEqual([]);
    expect(removed.text).toBe('');
    expect(removed.type).toBe('');
    // The row is gone, its neighbour is not, and the CATEGORY still
    // answers a page: nothing hangs off a term, so this is the one
    // delete on the taxonomy surface with neither a guard nor a
    // cascade, and a 204 that took the bucket with it would be
    // caught here rather than by anything the delete answered.
    expect(listed.status).toBe(200);
    expect(patternsOf(listed.body)).toStrictEqual([SECOND_PATTERN]);
    expect(listed.body.meta.total).toBe(1);
    expect(again.status).toBe(404);
    expect(again.body).toStrictEqual(NO_SUCH_TERM_BODY);
  });
});

// ---------------------------------------------------------------------------
// The round trip: a document posted here, and read back byte for byte
// ---------------------------------------------------------------------------

describe('a document posted and read back', () => {
  it('answers the bytes the import was handed', async () => {
    const { app, categoryId } = await withSeedCategory();
    const path = termsPath(categoryId);
    const document = serializeTermSeedDocument(SEED_FILE_ROWS);

    const imported = await request(app)
      .post(path)
      .type('application/json')
      .send(document);
    const exported = await request(app)
      .get(path)
      .query({ format: 'seed' });
    // The control, along the axis under test and through the SAME
    // operation: the file WHOLE, which is the same rows with the
    // header still on them, is refused 422. That is what makes the
    // absence below a removal this fixture had to make rather than
    // a detail of how it happened to be built.
    const withHeader = await request(app)
      .post(path)
      .type('application/json')
      .send(readFileSync(SEED_FILE_PATH, 'utf8'));

    expect(imported.status).toBe(201);
    // Every row reached the category. Without this the case is
    // green against an import that wrote nothing, since an export
    // of an empty category compares equal to an empty document.
    expect(imported.body.data.imported).toBe(SEED_FILE_ROWS.length);
    expect(exported.status).toBe(200);
    expect(exported.type).toBe('application/json');
    // THE WHOLE CLAIM, and it is about BYTES rather than about a
    // shape: what went in is character for character what came
    // out. The indent, the key order inside each row, the row
    // order and the single trailing newline are each a choice
    // `./seed-format.ts` makes, and a route that re-serialised the
    // document — or a store that handed the rows back in its
    // own order — would lose one of them while every assertion
    // in this file over a PARSED body stayed green.
    expect(exported.text).toBe(document);

    // THE SINGLE-CATEGORY SCOPE, stated because it is the reason
    // this document is not `data/terms.json`. That file's rows span
    // three categories and an export answers ONE: `categoryKey` is
    // stamped from the category row the path addressed, so a
    // document holding two categories' rows could not be exported
    // by any route. The fixture is therefore the file's rows for
    // one key, and the second assertion is what says the filter
    // narrowed something rather than answering the file back.
    expect(SEED_FILE_ROWS.length).toBeGreaterThan(0);
    expect(SEED_FILE_ROWS.length).toBeLessThan(ALL_SEED_ROWS.length);
    // Both `notes` shapes travel, which is what lets the byte
    // comparison fail at all: `JSON.stringify` drops an `undefined`
    // outright, so a document whose every note were null would
    // still compare equal under a serialiser that lost the member.
    expect(SEED_FILE_ROWS.some((row) => row.notes === null)).toBe(true);
    expect(SEED_FILE_ROWS.some((row) => row.notes !== null)).toBe(true);
    // THE `_readme` HEADER IS ABSENT, and no export could rebuild
    // it: the loader clears every underscore key before anything is
    // validated, so no row survives carrying one and nothing on the
    // way out knows the file ever had a header. The document above
    // therefore has ONE top-level member where the file on disk has
    // two, and posting the file itself is the refusal beside it.
    expect(Object.hasOwn(SEED_FILE as object, '_readme')).toBe(true);
    expect(keysOf(JSON.parse(document))).toStrictEqual(DOCUMENT_KEY_SET);
    expect(withHeader.status).toBe(422);
    expect(withHeader.body).toStrictEqual(SEED_FILE_HEADER_BODY);
  });
});
