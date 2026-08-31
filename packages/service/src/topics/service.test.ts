/**
 * `src/topics/service.ts` — what the six topic operations refuse,
 * and what they let through. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * ELEVEN CLAIMS IN TWO HALVES. The first seven are the ways this
 * module says no, and each carries the narrow CONTROL its refusal
 * needs, varied along the one axis the refusal turns on, because a
 * module refusing everything passes every assertion a refusal case
 * makes on its own. The last four are the reads and writes that go
 * through, and they carry the same discipline the other way round:
 * each write is compared as a WHOLE record against the row as it
 * was, because an operation reaching a member nobody submitted
 * answers a perfectly plausible topic that no field-by-field read
 * would report.
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
 * THAT THE TWO SCHEDULE VERBS REFUSE ON A STORED MEMBER RATHER
 * THAN ON WHAT WAS ASKED. A body says what a caller wanted;
 * `enabled` and `nextRunAt` say what the row IS, so neither of
 * these two 409s is reachable without reading the row first and
 * both would be a silent no-op if the write went through instead.
 * The table carries one row per verb with the state each turns on
 * declared as a member, so a module reading one column for both is
 * a named case rather than a count that still adds up, and each
 * row's control is the same call against a row in the OTHER state.
 * Three readings sit beside them that no single row could carry:
 * the two sentences are distinct, a disabled topic is told from an
 * id that names nothing by STATUS, and a disabled topic that IS
 * scheduled is paused rather than refused — which is what says a
 * pause is not a disable and that the run-now's guard was not
 * copied onto it.
 *
 * THAT A PAUSE BODY IS ONE REQUIRED COUNT, BOUNDED AT BOTH ENDS.
 * Four classes of refusal answering four codes: a fraction is
 * `invalid_type` because `.int()` fires first, a zero and a
 * negative are `too_small`, a count past the ceiling is `too_big`,
 * and an undeclared member is `unrecognized_keys` naming `body`.
 * The ceiling is spelled here rather than imported, so the value
 * is pinned and not merely the fact of one, and it is a BOUNDARY
 * rather than a number because the row a step above it is refused
 * in the same table the control a step below sits in. Two ordering
 * cases pin that the parse outranks both of the other refusals
 * this verb can raise — the 404 and the 409 — since the shape of a
 * body is a fact about the request alone.
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
 * THAT A LIST IS SCOPED TO ITS DOMAIN AND ORDERED BY NAME. The
 * fixture is what makes the first sharp: two domains research a
 * topic of the same name, so a read that reached past the domain
 * answers three rows here and the wrong one under the other slug.
 * The ordering claim is separate and needs the fixture too — the
 * rows are planted in the reverse of the order they come back in,
 * so a store handing them over as they went in is green against
 * every count. Beside them sit the two states a 404 could be
 * confused with: a domain researching nothing is an empty PAGE,
 * and a window narrower than the collection reports a `total` the
 * page in hand does not equal.
 *
 * THAT A CREATE LANDS ENABLED AND UNSCHEDULED. `nextRunAt` null
 * and `enabled` true are what the rest of this surface is built
 * on — a null due time is never claimed, and only an enabled row
 * can be run now — and each has the control that says it is a
 * DEFAULT rather than a constant: a body submitting `enabled`
 * false lands false, and one supplying bounds lands them. The
 * whole row is compared rather than those members, with the sorted
 * key set beside it, since `topics` spreads `schedulableColumns()`
 * and a column added to that one helper reaches this projection
 * with no topic module edited at all.
 *
 * THAT A PATCH REPLACES RATHER THAN MERGES, AND WRITES ONE MEMBER
 * AT A TIME. `searchTerms` is the member that rule exists for and
 * it gets three readings, because a merge and a replace agree on
 * everything but the third: a disjoint list, a SUBSET of the
 * stored one — the shape a caller who edited a list actually
 * sends, and the one where a merge is invisible — and the empty
 * list read back through the collection. The two bounds are read
 * as separate members rather than as a pair, set on a topic
 * carrying none, moved on one carrying both, and one moved with
 * the other left alone. `enabled` is read in both directions,
 * since a service folding it through `||` writes true for a
 * submitted false and is green on the way back.
 *
 * THAT A DELETE ANSWERS NOTHING AND TAKES ONE ROW. Nothing in
 * schema v2 points at `topics`, so the whole of what this
 * operation answers is `undefined` and the whole of what it did is
 * read back off the page: the sibling compared as a whole record,
 * the second domain's topic of that same name still standing, a
 * second delete of the same id refused, and the name free for the
 * next create — the one reading that says the key went with the
 * row rather than outliving it.
 *
 * Mutation legs, run over this file with `--reporter=json` and read
 * as the failed case SET rather than as a count. The first
 * seventeen were measured against 102 cases and are recorded
 * below; the schedule verbs took the file to 139 and added twelve
 * of their own, measured there.
 *
 * THE OLD SEVENTEEN WERE NOT ALL RE-RUN, and the argument for that
 * is what makes the bounded run honest rather than a shortcut. The
 * verbs left every earlier case unchanged and every code path they
 * do not call byte-identical, so each recorded red SET still holds
 * over the old cases and only a DELTA over the new ones was ever in
 * question. What narrows the legs worth reconstructing is reading
 * what the new cases CALL: they call `createTopic` (for the
 * fixture) and `patchTopic` (to retire a topic), and nothing else
 * of the old surface. Those two were reconstructed and both came
 * back at exactly their recorded figures OUTSIDE the new sections,
 * which is what says the leg rebuilt was the leg the prose names.
 * Defaulting `enabled` to false still reddens 4 old cases and now
 * 2 new ones; folding the patch's `enabled` through `||` still
 * reddens 2 old and now 5 new — the verbs being where a wrongly
 * written `enabled` is loudest, which is the pair paying for
 * itself.
 *
 * Seventeen legs, ten aimed at the refusals and seven at the half
 * below them, because a grid made of one class leaves the other
 * green while looking thorough. Two of the seventeen mutate
 * `tests/helpers/memory-research-store.ts` rather than the service:
 * the replace-whole rule and the page's order are the STORE's, and
 * no leg over this module could reach either. Every figure is a
 * measurement over this case count and moves again if a later task
 * adds to this file.
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
 * reddens 2 of a different shape, the empty-list control here and
 * the patch that clears every term below, which is what says
 * neither is vacuous.
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
 * The three create-default legs are what say the two omissions
 * become values HERE rather than at a column. Defaulting `enabled`
 * to false reddens 4 — the two create cases that read it, and both
 * retirement cases below, since the fixture's own topics would then
 * land disabled. Defaulting `searchTerms` to a non-empty list
 * reddens 2, one of them the delete case reading the terms of a
 * topic created under a freed name. Defaulting a bound to zero
 * rather than null reddens 3, one of which is the whole-row compare
 * on a case named for neither bound — that compare paying for
 * itself.
 *
 * Folding the patch's `enabled` through `||` reddens exactly 2, and
 * the case it leaves GREEN is the reading: bringing a retired topic
 * back submits true, so a fold writing true whatever arrived passes
 * it. The pair is what makes the member two-directional rather than
 * one-way.
 *
 * The two store legs reach what no service mutation can. Merging
 * the submitted term list into the stored one rather than replacing
 * it reddens 5, across all three replace readings, the read-back
 * beside them and the refusal half's empty-list control. Ordering
 * the page by id rather than by name reddens 7, three of them
 * read-back cases in the refusal half that had been reading a page
 * whose order they never asserted.
 *
 * The blunt leg is recorded rather than read: a store ignoring the
 * domain scope entirely reddens 90 of 102, because `plantTopics`
 * cannot build a fixture whose two domains research one name at
 * all. That is the fixture's design reporting rather than any case,
 * and it is why the explicit widening control sits beside it.
 *
 * THE TWELVE SCHEDULE LEGS, measured against 139 cases. Eleven of
 * the twelve redden a set lying ENTIRELY inside the two new
 * sections, which is what says the verbs' rules are pinned by the
 * cases named for them rather than by something further down the
 * file.
 *
 * The two state guards nest with their neighbours rather than
 * overlapping. Removing the run-now's `enabled` guard reddens 4
 * and removing the pause's NULL guard reddens 3, sharing only the
 * distinctness case; giving the PAUSE the run-now's guard reddens
 * exactly 1 — the disabled-but-scheduled case — which is the one
 * reading that says the two verbs read different columns.
 * Answering both states a 404 reddens a strict SUBSET of 2, since
 * a wrong status still leaves an `AppError` for `refusalFrom` to
 * hand back, and collapsing the two sentences reddens only the
 * distinctness case.
 *
 * The four clauses of the cycles schema redden four DISJOINT sets,
 * which is what says each is separately pinned. `.nonnegative()`
 * for `.positive()` reddens 4 — the zero row plus the three cases
 * that send a zero as their malformed body — dropping `.int()`
 * reddens exactly 1, dropping the ceiling reddens the 2 rows past
 * it, and dropping `.strict()` reddens the 3 undeclared-member
 * rows. Lowering the ceiling to one reddens only the at-ceiling
 * control, which is the reading that makes it a boundary: every
 * refusal row stays green under it.
 *
 * Parsing the body AFTER reading the row reddens exactly 1, the
 * unknown-id ordering case. The 409 ordering case stays green
 * under it, because a read that finds the row still falls through
 * to the parse — so the two ordering cases are one claim each
 * rather than a pair, and only the first has a leg.
 *
 * The twelfth reddens ZERO and is recorded rather than repaired:
 * basing the pause on the clock alone instead of on the later of
 * the clock and the stored due time changes nothing here. That
 * rule is the positive half's, and this file's schedule sections
 * are refusals — the cases that would report it land with the
 * verbs' positive cases.
 *
 * What no module mutation reaches, by construction: the table
 * guards read only the tables beside them and are aimed at a later
 * edit, such as an operation added with no row or a body half
 * deleted whole. The planted containment control is invisible to
 * every leg for the same reason and deliberately so: it proves the
 * SEARCH, where the rethrow legs prove the SUBJECT.
 */

import type { TopicPage, TopicServiceStore } from './service.js';
import type { TopicRecord } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MovableClock,
} from '../../tests/helpers/memory-auth-store.js';
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
  createMovableClock,
} from '../../tests/helpers/memory-auth-store.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { StoreRefusal } from '../db/store-errors.js';

import {
  createTopic,
  deleteTopic,
  listTopics,
  patchTopic,
  pauseTopic,
  runTopicNow,
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
 * Where the injected clock reads, so a written instant is exact.
 *
 * Fixed rather than taken from the present, which is what lets a
 * schedule case compare a stored `nextRunAt` for equality instead
 * of asserting it fell inside a window. Nothing in this file
 * advances it: the refusals below turn on `enabled` and on a NULL
 * due time, neither of which is a question about elapsed time.
 */
const FIXED_INSTANT = new Date('2026-08-31T09:00:00.000Z');

/**
 * The ceiling `pauseTopicSchema` puts on `cycles`, re-spelled here
 * rather than imported.
 *
 * The constant in `./service.ts` is private, and it would be worth
 * keeping private even if it were not: a test reading the ceiling
 * off the module it is checking is green for every value the
 * module might hold, so a limit quietly lowered to one would pass.
 * Spelling it pins the VALUE, which is the claim a caller depends
 * on. The row a step above it and the control a step below are
 * what make the pin a boundary rather than a number.
 */
const MAX_CYCLES = 1000;

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

  /**
   * The clock both schedule verbs are handed, reading
   * {@link FIXED_INSTANT}.
   *
   * On the fixture rather than built per case, so that every call
   * in one case reads one present — a run-now and the pause that
   * follows it would otherwise be measured against two instants
   * a millisecond or so apart, and an equality between them would
   * be a race rather than a claim.
   */
  readonly clock: MovableClock;

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
  const clock = createMovableClock(FIXED_INSTANT);

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

  return { store, clock, transformers, inference, foreign };
}

/**
 * Gives one topic a due time, so a pause has a run to defer.
 *
 * Through the STORE rather than through {@link runTopicNow}, which
 * is the one place this file plants past the subject and is worth
 * the exception. Both verbs are under test here, and routing the
 * pause fixture through the run-now would make a broken run-now
 * redden the pause cases as well — noise in exactly the column
 * where the attribution matters. `updateTopicSchedule` is the port
 * method the verb itself writes through, so what is planted is the
 * state a run-now leaves rather than a shape only a test can build.
 *
 * @param planted - The store and its rows.
 * @param topic - The row to schedule.
 * @param at - The instant to give it. Defaults to the clock's own
 *   reading, which is where a run-now would have left it.
 * @returns The stored row, now carrying a due time.
 * @throws When the store answered null, which would mean the row
 *   the caller was handed is not there — a fixture fault rather
 *   than an answer any case should assert over.
 */
async function schedule(
  planted: PlantedTopics,
  topic: TopicRecord,
  at: Date = planted.clock.now(),
): Promise<TopicRecord> {
  const scheduled = await planted.store.updateTopicSchedule(topic.id, at);

  if (scheduled === null) {
    throw new Error('the fixture could not schedule a topic it planted');
  }

  return scheduled;
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
  'pauseTopic',
  'runTopicNow',
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
  {
    operation: 'runTopicNow',
    subject: 'topic',
    refuse: ({ store, clock }) => runTopicNow(store, clock.now, MISSING_ID),
    control: ({ store, clock, inference }) => runTopicNow(
      store,
      clock.now,
      inference.id,
    ),
  },
  {
    // The id is read before the body reaches a store, but AFTER
    // the body is parsed: the `cycles` here is a legal one, so
    // what this row measures is the address and not the payload.
    // A row sending a bad body as well would answer 422 and pass
    // for a 404 nobody checked.
    operation: 'pauseTopic',
    subject: 'topic',
    refuse: ({ store, clock }) => pauseTopic(
      store,
      clock.now,
      MISSING_ID,
      { cycles: 1 },
    ),
    control: async (planted) => {
      // The control needs a SCHEDULED row, since an unscheduled
      // one is the 409 two sections below. Planted here rather
      // than in the fixture, so the topics every other case reads
      // stay unscheduled exactly as a create leaves them.
      await schedule(planted, planted.inference);

      return pauseTopic(
        planted.store,
        planted.clock.now,
        planted.inference.id,
        { cycles: 1 },
      );
    },
  },
];

describe('an address that names nothing', () => {
  it('covers every operation this module exports', () => {
    // Paired by name rather than by count, so a seventh operation
    // added to the module without a row here is this case failing
    // rather than a table that quietly covers six of seven. The
    // two schedule verbs owed rows here when they landed, and this
    // guard is what said so; both are in the table below.
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

/**
 * The two operations {@link BODY_CASES} covers.
 *
 * Not every operation here that takes a body: {@link pauseTopic}
 * takes one too and has a table of its own further down. The two
 * are kept apart because a pause body shares no member with these
 * — one required `cycles` against six declared members — so every
 * guard below would have to grow an arm that could never fire.
 */
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
// The states the two schedule verbs refuse
// ---------------------------------------------------------------------------

/** Both functions that write `next_run_at`. */
const SCHEDULE_VERBS = ['pauseTopic', 'runTopicNow'];

/**
 * One verb met by a stored row it cannot act on, beside the same
 * verb met by one it can.
 *
 * THE FACT EACH TURNS ON IS A STORED MEMBER, which is what makes
 * these two refusals different in kind from every 422 below. A
 * body says what was asked; `enabled` and `nextRunAt` say what the
 * row is, so neither refusal is reachable without reading the row
 * first — and both would be a silent no-op if the write went
 * through instead. A run-now onto a disabled row writes a due time
 * `topics_dispatch_claim_idx` excludes, and a pause of an
 * unscheduled row SCHEDULES it.
 *
 * The control is a member of the row rather than a table of its
 * own, for the reason {@link MissingCase} gives: a 409 for a state
 * means nothing unless the identical call against the other state
 * answers.
 */
interface ScheduleStateCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The verb under test, and half of what this table covers. */
  readonly verb: string;

  /** Which stored member the refusal turns on. */
  readonly member: 'enabled' | 'nextRunAt';

  /** The call that has to be refused. */
  readonly refuse: (planted: PlantedTopics) => Promise<unknown>;

  /** The same call against a row in the other state. */
  readonly control: (planted: PlantedTopics) => Promise<unknown>;
}

/** Both states a verb refuses, one per verb. */
const SCHEDULE_STATE_CASES: readonly ScheduleStateCase[] = [
  {
    label: 'a run-now against a topic that is disabled',
    verb: 'runTopicNow',
    member: 'enabled',
    refuse: async (planted) => {
      // Retired through the patch this surface offers for it, so
      // the refused state is one a caller can actually produce.
      await patchTopic(planted.store, planted.inference.id, {
        enabled: false,
      });

      return runTopicNow(
        planted.store,
        planted.clock.now,
        planted.inference.id,
      );
    },
    control: ({ store, clock, inference }) => runTopicNow(
      store,
      clock.now,
      inference.id,
    ),
  },
  {
    label: 'a pause against a topic that is not scheduled',
    verb: 'pauseTopic',
    member: 'nextRunAt',
    // The fixture's topics are unscheduled as `createTopic` left
    // them, so this row plants nothing: the state it refuses is
    // the one every created and every seeded topic is already in.
    refuse: ({ store, clock, inference }) => pauseTopic(
      store,
      clock.now,
      inference.id,
      { cycles: 1 },
    ),
    control: async (planted) => {
      await schedule(planted, planted.inference);

      return pauseTopic(
        planted.store,
        planted.clock.now,
        planted.inference.id,
        { cycles: 1 },
      );
    },
  },
];

describe('the states the two schedule verbs refuse', () => {
  it('carries a row for each verb', () => {
    // Paired by name against the roster rather than counted, so a
    // third verb added to the module without a row here is this
    // case failing rather than a table that quietly covers two of
    // three.
    expect(SCHEDULE_STATE_CASES.map((row) => row.verb).sort())
      .toEqual([...SCHEDULE_VERBS].sort());
  });

  it('turns each refusal on a different stored member', () => {
    // The two refusals are not one rule: a module reading only
    // `enabled` would refuse an unscheduled row for the wrong
    // reason, or not at all.
    expect([...new Set(SCHEDULE_STATE_CASES.map((row) => row.member))].sort())
      .toEqual(['enabled', 'nextRunAt']);
  });

  it('labels every row distinctly', () => {
    const labels = SCHEDULE_STATE_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  for (const row of SCHEDULE_STATE_CASES) {
    it(`answers 409 to ${row.label}`, async () => {
      const planted = await plantTopics();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal.code).toBe('CONFLICT');
      expect(refusal.statusCode).toBe(409);

      // No `details`: the refusal is one fact about one row, and
      // there is no per-member count for one to carry.
      expect(refusal.details).toBeUndefined();
    });

    it(`answers ${row.verb} against a row in the other state`, async () => {
      // The narrow control, varied along the one axis the refusal
      // turns on: the same verb, the same body, a row whose stored
      // member is the other value. A verb refusing every call
      // passes the case above and fails this one.
      const planted = await plantTopics();

      await expect(row.control(planted)).resolves.not.toThrow();
    });

    it(`writes no due time when it refuses ${row.verb}`, async () => {
      // Read back off the row rather than off the refusal: a verb
      // that wrote and then threw satisfies every assertion above,
      // and this surface has no other reader of the column to
      // report it. The fixture's topics are unscheduled, so the
      // reading is the same for both rows — null before, null
      // after.
      const planted = await plantTopics();

      await refusalFrom(() => row.refuse(planted));

      const stored = await planted.store.findTopicById(planted.inference.id);

      expect(stored?.nextRunAt).toBeNull();
    });
  }

  it('says which of the two states was wrong', async () => {
    // Not a pin on the wording, which is free to change: a pin on
    // the DISTINCTION. One sentence answered to both would send an
    // operator to enable a topic whose fault was that it had never
    // been scheduled, and is green against every case above.
    const said = new Set<string>();

    for (const row of SCHEDULE_STATE_CASES) {
      const planted = await plantTopics();
      const refusal = await refusalFrom(() => row.refuse(planted));

      said.add(refusal.message);
    }

    expect(said.size).toBe(SCHEDULE_STATE_CASES.length);
  });

  it('tells a disabled topic from one that names nothing', async () => {
    // The two refusals a run-now can raise, told apart by status
    // rather than by sentence: a row that is not there is a 404
    // and a row that is there and disabled is a 409. A verb
    // answering one to both would report a mistyped id as a
    // configuration problem.
    const planted = await plantTopics();

    await patchTopic(planted.store, planted.inference.id, { enabled: false });

    const disabled = await refusalFrom(() => runTopicNow(
      planted.store,
      planted.clock.now,
      planted.inference.id,
    ));
    const absent = await refusalFrom(() => runTopicNow(
      planted.store,
      planted.clock.now,
      MISSING_ID,
    ));

    expect(disabled.statusCode).toBe(409);
    expect(absent.statusCode).toBe(404);
  });

  it('pauses a disabled topic rather than refusing it', async () => {
    // The interaction the two rows above cannot show on their own.
    // A pause does not read `enabled` at all, so a disabled topic
    // that IS scheduled is paused rather than refused — pause is
    // not disable, and the schema keeps the two columns apart on
    // purpose. A verb that had copied the run-now's guard passes
    // both rows above and fails this.
    const planted = await plantTopics();

    await schedule(planted, planted.inference);
    await patchTopic(planted.store, planted.inference.id, {
      enabled: false,
    });

    const paused = await pauseTopic(
      planted.store,
      planted.clock.now,
      planted.inference.id,
      { cycles: 1 },
    );

    expect(paused.enabled).toBe(false);
    expect(paused.nextRunAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The pause bodies this surface refuses
// ---------------------------------------------------------------------------

/**
 * One pause body, and what {@link pauseTopic} answers to it.
 *
 * A TABLE OF ITS OWN RATHER THAN ROWS IN {@link BODY_CASES}, and
 * the reason is that a pause body shares no member with the other
 * two. `cycles` is the only thing it declares; there is no `name`
 * to be empty, no `searchTerms` to hold a non-string, and no
 * cadence — so the guards that make the create-and-patch table
 * readable would each have to grow an arm that could never fire.
 * What the two tables do share is the shape of the claim: every
 * row is submitted to the SERVICE and not to a schema, which is
 * what says an MCP tool in wave 3 cannot be handed a body the HTTP
 * route would have refused.
 *
 * FOUR CLASSES OF REFUSAL AND FOUR CODES, which is the reading the
 * rows exist to separate. `.int()` answers `invalid_type` and
 * fires first, so a fraction is refused for its type rather than
 * for its size. `.positive()` answers `too_small`, which covers a
 * zero and a negative alike. {@link MAX_CYCLES} answers `too_big`.
 * `.strict()` answers `unrecognized_keys` at the root, naming
 * `body` rather than the key submitted. A schema that had kept
 * `.int()` and dropped `.positive()` passes the fraction row and
 * fails the zero one, which is why neither stands in for the
 * other.
 *
 * The rows are submitted against a SCHEDULED topic, so nothing
 * here can pass for the `409` an unscheduled one answers. The body
 * is parsed before the row is read, so the fixture makes no
 * difference to what these rows measure — which is exactly why one
 * row below sends a legal body's neighbour against an id that is
 * not there, to pin that ordering rather than assume it.
 */
interface CyclesCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The body, unvalidated, exactly as a request would carry it. */
  readonly body: unknown;

  /** Every detail the refusal has to carry, in order. */
  readonly details: readonly ExpectedDetail[];
}

/** The pause bodies {@link pauseTopicSchema} has to refuse. */
const CYCLES_CASES: readonly CyclesCase[] = [
  {
    label: 'a pause of zero cycles',
    body: { cycles: 0 },
    details: [{ field: 'cycles', code: 'too_small' }],
  },
  {
    label: 'a pause of minus one cycle',
    body: { cycles: -1 },
    details: [{ field: 'cycles', code: 'too_small' }],
  },
  {
    label: 'a pause of one and a half cycles',
    body: { cycles: 1.5 },
    details: [{ field: 'cycles', code: 'invalid_type' }],
  },
  {
    label: 'a pause one cycle past the ceiling',
    body: { cycles: MAX_CYCLES + 1 },
    details: [{ field: 'cycles', code: 'too_big' }],
  },
  {
    // A count far past the ceiling rather than a step past it, so
    // the two rows are not one claim: this is the value that would
    // carry the product beyond the range a `Date` holds and store
    // as the NULL the pause refuses to create.
    label: 'a pause of a million cycles',
    body: { cycles: 1_000_000 },
    details: [{ field: 'cycles', code: 'too_big' }],
  },
  {
    label: 'a pause body carrying no count at all',
    body: {},
    details: [{ field: 'cycles', code: 'invalid_type' }],
  },
  {
    label: 'a pause clearing its count with null',
    body: { cycles: null },
    details: [{ field: 'cycles', code: 'invalid_type' }],
  },
  {
    label: 'a pause counting cycles as a string',
    body: { cycles: '3' },
    details: [{ field: 'cycles', code: 'invalid_type' }],
  },
  {
    label: 'a pause body that is not an object',
    body: null,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a pause naming the instant it wants written',
    body: { cycles: 1, nextRunAt: '2026-09-30T09:00:00.000Z' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a pause retiring the topic on its way past',
    body: { cycles: 1, enabled: false },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    // Two faults and two details, in the order zod raised them:
    // the member that is missing, then the one that is not
    // declared. The only row here that carries more than one, and
    // worth having because a misspelt `cycles` is the likeliest
    // mistake this schema meets — a caller reading only the first
    // detail would fix the count and still be refused.
    label: 'a pause counting seconds instead of cycles',
    body: { seconds: 3600 },
    details: [
      { field: 'cycles', code: 'invalid_type' },
      { field: 'body', code: 'unrecognized_keys' },
    ],
  },
];

describe('the pause bodies this surface refuses', () => {
  it('labels every row distinctly', () => {
    const labels = CYCLES_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('names a distinct reason for each class of refusal', () => {
    const codes = CYCLES_CASES.flatMap(
      (row) => row.details.map((detail) => detail.code),
    );

    expect([...new Set(codes)].sort()).toEqual([
      'invalid_type', 'too_big', 'too_small', 'unrecognized_keys',
    ]);
  });

  it('refuses the three counts a caller is likeliest to send', () => {
    // The scoped claim, held against the table rather than against
    // a memory of what was written into it, and read off the BODY
    // so renaming a row cannot satisfy it. A row deleted from any
    // of the three stops this file covering the refusal it is
    // named for, and nothing else here would report that.
    const counted = new Map(CYCLES_CASES
      .filter((row) => bodyCarries(row.body, 'cycles'))
      .map((row) => [
        (row.body as { cycles: unknown }).cycles,
        row.details.map((detail) => detail.code).join(),
      ]));

    expect(counted.get(0)).toBe('too_small');
    expect(counted.get(1.5)).toBe('invalid_type');
    expect(counted.get(MAX_CYCLES + 1)).toBe('too_big');
  });

  it('refuses the pipeline-owned member from this body too', () => {
    // `nextRunAt` is refused by all three bodies on this surface,
    // and by the same clause in each: `.strict()` doing its
    // ordinary work rather than a per-column check. Held here as
    // well as in {@link PIPELINE_OWNED} because the pause is the
    // one body whose whole subject IS that column.
    const naming = CYCLES_CASES.filter(
      (row) => bodyCarries(row.body, 'nextRunAt'),
    );

    expect(naming.length).toBe(1);
    expect(naming.flatMap((row) => row.details.map(
      (detail) => detail.code,
    ))).toEqual(['unrecognized_keys']);
  });

  for (const row of CYCLES_CASES) {
    it(`refuses ${row.label}`, async () => {
      const planted = await plantTopics();

      await schedule(planted, planted.inference);

      const refusal = await refusalFrom(() => pauseTopic(
        planted.store,
        planted.clock.now,
        planted.inference.id,
        row.body,
      ));

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual([...row.details]);
    });
  }

  it('accepts a pause of one cycle', async () => {
    // The boundary control for the zero and the negative rows, a
    // single step from the value they refuse. A schema that had
    // stopped checking `cycles` at all passes those rows'
    // neighbours and fails them; a schema refusing every count
    // passes them and fails this.
    const planted = await plantTopics();

    await schedule(planted, planted.inference);

    const paused = await pauseTopic(
      planted.store,
      planted.clock.now,
      planted.inference.id,
      { cycles: 1 },
    );

    expect(paused.nextRunAt).not.toBeNull();
  });

  it('accepts a pause at exactly the ceiling', async () => {
    // The other boundary control, and the one that makes the
    // ceiling a BOUNDARY rather than a number. The row above sends
    // one more than this and is refused; a ceiling quietly lowered
    // fails here while every refusal row stays green.
    const planted = await plantTopics();

    await schedule(planted, planted.inference);

    const paused = await pauseTopic(
      planted.store,
      planted.clock.now,
      planted.inference.id,
      { cycles: MAX_CYCLES },
    );

    expect(paused.nextRunAt).not.toBeNull();
  });

  it('writes no due time when it refuses a body', async () => {
    // Read back off the row: a verb that parsed after writing
    // would satisfy every assertion above. The topic is scheduled
    // first, so what this reads is the instant the fixture put
    // there rather than a null that could also mean nothing
    // happened.
    const planted = await plantTopics();
    const scheduled = await schedule(planted, planted.inference);

    await refusalFrom(() => pauseTopic(
      planted.store,
      planted.clock.now,
      planted.inference.id,
      { cycles: 0 },
    ));

    const stored = await planted.store.findTopicById(planted.inference.id);

    expect(stored?.nextRunAt).toStrictEqual(scheduled.nextRunAt);
  });

  it('refuses a malformed pause against an id that is not there', async () => {
    // The ordering: the body is parsed before the row is read, so
    // a bad body outranks an address naming nothing. The shape of
    // a body is a fact about the request alone, and answering the
    // same body a 422 or a 404 depending on what happens to be
    // stored would make a caller's error depend on rows it never
    // asked about.
    const planted = await plantTopics();
    const refusal = await refusalFrom(() => pauseTopic(
      planted.store,
      planted.clock.now,
      MISSING_ID,
      { cycles: 0 },
    ));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
  });

  it('refuses a malformed pause against a topic not scheduled', async () => {
    // The other ordering, and the one only this verb has: the
    // parse outranks the 409 as well as the 404. The fixture's
    // topics are unscheduled, so a module reading the row first
    // answers 409 here and passes every other case in this
    // section.
    const planted = await plantTopics();
    const refusal = await refusalFrom(() => pauseTopic(
      planted.store,
      planted.clock.now,
      planted.inference.id,
      { cycles: 0 },
    ));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
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

// ---------------------------------------------------------------------------
// What a list scopes to
// ---------------------------------------------------------------------------

/**
 * The members `TopicRecord` declares.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at
 * all against the drift that matters. `satisfies` closes the
 * direction where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about.
 *
 * The second direction is the one THIS table needs. `topics`
 * spreads `schedulableColumns()` from
 * `src/db/schema/scheduling.ts`, which `export_subscriptions`
 * spreads too, so a column added to that one helper reaches
 * `TopicRecord` and every projection under it without a single
 * topic module being edited — and every field-by-field assertion
 * in this file stays green while the surface answers a member
 * nobody argued onto it.
 */
const TOPIC_KEYS = [
  'domainId',
  'enabled',
  'id',
  'intervalSeconds',
  'maxIntervalSeconds',
  'minIntervalSeconds',
  'name',
  'nextRunAt',
  'searchTerms',
] as const satisfies readonly (keyof TopicRecord)[];

/** The two members a page carries around its rows. */
const PAGE_KEYS = [
  'rows',
  'total',
] as const satisfies readonly (keyof TopicPage)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration:
 * without it the union distributes over the conditional and the
 * answer is `boolean`, which accepts `true` as an initializer and
 * pins nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** Both lists above, held against the types they describe. */
type EveryKeyListed =
  CoversEveryKey<TopicRecord, typeof TOPIC_KEYS>
  & CoversEveryKey<TopicPage, typeof PAGE_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `TopicRecord` or to `TopicPage` and to neither
 * list above turns {@link EveryKeyListed} into `never`, and this
 * initializer is then a TS2322 at this line — before any case can
 * compare a record against a set that has quietly stopped
 * describing it. Read in a case below, so it is a symbol this file
 * uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link TOPIC_KEYS}, sorted at use rather than by hand. */
const TOPIC_KEY_SET: readonly string[] = [...TOPIC_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** A third domain, invented in the same neutral register. */
const SEABED = 'example-seabed-mapping';

/**
 * Finds one answered topic by the name it carries.
 *
 * @param rows - What a read answered.
 * @param name - The name to look for.
 * @returns The row carrying it.
 * @throws When no row does. A `find` answering `undefined`
 *   compares equal to another `undefined`, so a case reading a
 *   stored row back against a write that never landed would
 *   otherwise pass for nobody's reason.
 */
function topicNamed(
  rows: readonly TopicRecord[],
  name: string,
): TopicRecord {
  const found = rows.find((row) => row.name === name);

  if (found === undefined) {
    throw new Error('no answered row carries that name');
  }

  return found;
}

describe('what a list scopes to', () => {
  it('holds both key sets against the types they describe', () => {
    // The runtime half of the pin above. What it asserts is not
    // the `true` — that is a constant — but that the symbol exists
    // to be read: its VALUE is the statement `check-types` makes
    // at the declaration, which is a TS2322 the moment either type
    // grows a member neither list names.
    expect(EVERY_KEY_LISTED).toBe(true);
  });

  it('answers the topics of the domain it was given', async () => {
    // The scoping claim, and the fixture is what makes it sharp:
    // both domains research a topic named `transformers`, so a
    // read that reached past the domain answers three rows here
    // and the wrong one under TRANSIT. Whole records rather than
    // names, so a page assembled out of the right names and the
    // wrong rows is this case failing.
    const planted = await plantTopics();
    const here = await listTopics(planted.store, RADAR, WIDE_WINDOW);
    const there = await listTopics(planted.store, TRANSIT, WIDE_WINDOW);

    expect(here.rows).toStrictEqual([planted.inference, planted.transformers]);
    expect(here.total).toBe(2);
    expect(there.rows).toStrictEqual([planted.foreign]);
    expect(there.total).toBe(1);

    // The sorted key SET beside the records the case compares. A
    // member arriving on the row by spread — a column nobody
    // projected — is invisible to a compare against a record this
    // same module answered, and is exactly what this line catches.
    expect(Object.keys(topicNamed(here.rows, 'transformers')).sort())
      .toEqual([...TOPIC_KEY_SET]);
    expect(Object.keys(here).sort()).toEqual([...PAGE_KEY_SET]);
  });

  it('tells the two rows of one name apart by their domain', async () => {
    // The scoping claim read from the other end: the two records
    // sharing a name differ in every other member, so a read
    // answering EITHER of them under both slugs would pass a
    // name-only comparison and fail this.
    const planted = await plantTopics();
    const here = await listTopics(planted.store, RADAR, WIDE_WINDOW);
    const there = await listTopics(planted.store, TRANSIT, WIDE_WINDOW);
    const mine = topicNamed(here.rows, 'transformers');
    const theirs = topicNamed(there.rows, 'transformers');

    expect(mine.domainId).not.toBe(theirs.domainId);
    expect(mine.id).not.toBe(theirs.id);
    expect(mine.searchTerms).not.toEqual(theirs.searchTerms);
  });

  it('orders the page by name rather than by insertion', async () => {
    // The fixture plants `transformers` first and `edge inference`
    // second, so a read handing rows back in the order they went
    // in answers the reverse of this and is green against every
    // count above. Ordering on the name is what makes a paginated
    // read total: `nextRunAt` is nullable, non-unique and MOVES
    // under the dispatcher, so a page over it would reorder itself
    // between two requests.
    const planted = await plantTopics();
    const page = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.name))
      .toEqual(['edge inference', 'transformers']);
    expect(planted.transformers.id).toBeLessThan(planted.inference.id);
  });

  it('reports the collection rather than the page in hand', async () => {
    // `total` is a second question rather than the length of the
    // rows in hand, and the refusal half of this file could not
    // say so: its one window was wider than every collection, so a
    // total taken off the rows would have been right there. This
    // window holds one row of two.
    const planted = await plantTopics();
    const page = await listTopics(planted.store, RADAR, {
      limit: 1,
      offset: 0,
    });

    expect(page.rows.map((row) => row.name)).toEqual(['edge inference']);
    expect(page.total).toBe(2);
  });

  it('answers an empty page for a domain holding none', async () => {
    // A domain with no topics and a slug naming no domain are two
    // states, and this is the one that is not a 404: the
    // collection is there and empty. The RADAR read beside it is
    // the control — a module answering an empty page to everything
    // passes the first half of this and fails the second.
    const planted = await plantTopics();

    await planted.store.insertDomain({
      slug: SEABED,
      name: 'Seabed',
      settings: {},
    });

    const empty = await listTopics(planted.store, SEABED, WIDE_WINDOW);
    const held = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(empty).toStrictEqual({ rows: [], total: 0 });
    expect(held.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// What a create lands
// ---------------------------------------------------------------------------

/** The subject every create below adds to a domain. */
const FRESH_NAME = 'retrieval augmentation';

/** The terms it issues. */
const FRESH_TERMS = ['retrieval augmentation', 'vector recall'];

describe('what a create lands', () => {
  it('answers a row that is enabled and unscheduled', async () => {
    // The whole row rather than the members the case is named
    // for. `nextRunAt` null and `enabled` true are the two the
    // rest of this surface is built on — a null due time is never
    // claimed by `ar-dispatch`, and an enabled row is the only
    // kind `POST /topics/:id/run-now` will schedule — but a create
    // reaching a member nobody submitted is exactly as wrong and
    // is invisible to a pair of field reads.
    const planted = await plantTopics();
    const created = await createTopic(planted.store, RADAR, {
      name: FRESH_NAME,
      searchTerms: FRESH_TERMS,
      intervalSeconds: HOURLY,
    });

    expect(created).toStrictEqual({
      id: created.id,
      domainId: planted.transformers.domainId,
      name: FRESH_NAME,
      searchTerms: FRESH_TERMS,
      intervalSeconds: HOURLY,
      nextRunAt: null,
      enabled: true,
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    });

    // The id is the store's own — no body here carries one — and
    // the sorted key set beside it, since the id is the one member
    // a whole-row compare cannot pin against anything but itself.
    expect(created.id).toBeGreaterThan(planted.foreign.id);
    expect(Object.keys(created).sort()).toEqual([...TOPIC_KEY_SET]);
  });

  it('turns the two omissions into values rather than absences', async () => {
    // `searchTerms` and `enabled` are optional in the schema and
    // REQUIRED by `InsertTopicInput`, so what an absence means is
    // decided in the service and is readable here rather than
    // left to a column only one of the two implementations has.
    // The empty list is a complete value: the topic comes due on
    // time and gives its run nothing to issue.
    const { store } = await plantTopics();
    const created = await createTopic(store, RADAR, {
      name: FRESH_NAME,
      intervalSeconds: HOURLY,
    });

    expect(created.searchTerms).toEqual([]);
    expect(created.enabled).toBe(true);
    expect(created.nextRunAt).toBeNull();
  });

  it('stages a topic switched off when the body says so', async () => {
    // The control that makes the `enabled: true` above a DEFAULT
    // rather than a constant: a service writing true whatever was
    // submitted passes both cases above and fails this. It is also
    // the state the run-now verb refuses, so a topic staged off is
    // one an operator has to enable deliberately rather than one
    // that quietly answers a run-now with a due time nothing ever
    // reads.
    const { store } = await plantTopics();
    const created = await createTopic(store, RADAR, {
      name: FRESH_NAME,
      intervalSeconds: HOURLY,
      enabled: false,
    });

    expect(created.enabled).toBe(false);
    expect(created.nextRunAt).toBeNull();
  });

  it('folds an absent bound and an explicit null together', async () => {
    // On a create there is nothing stored for an absent bound to
    // leave alone, so the two spellings mean one thing and the
    // service folds them. One bound is submitted null and the
    // other omitted in the same call, so the two paths are read
    // against each other rather than one at a time.
    const { store } = await plantTopics();
    const created = await createTopic(store, RADAR, {
      name: FRESH_NAME,
      intervalSeconds: HOURLY,
      minIntervalSeconds: null,
    });

    expect(created.minIntervalSeconds).toBeNull();
    expect(created.maxIntervalSeconds).toBeNull();
  });

  it('lands the bounds a body did supply', async () => {
    // The control for the case above: a service folding every
    // bound to null passes it and fails this. Both members, since
    // a floor written from the ceiling's value is a plausible row
    // no single-bound read would report.
    const { store } = await plantTopics();
    const created = await createTopic(store, RADAR, {
      name: FRESH_NAME,
      intervalSeconds: HOURLY,
      minIntervalSeconds: 600,
      maxIntervalSeconds: 86400,
    });

    expect(created.minIntervalSeconds).toBe(600);
    expect(created.maxIntervalSeconds).toBe(86400);
  });

  it('stores the row it answered', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what one call happened to
    // answer: a create returning a row it never wrote passes every
    // case above and fails this.
    const planted = await plantTopics();
    const created = await createTopic(planted.store, RADAR, {
      name: FRESH_NAME,
      searchTerms: FRESH_TERMS,
      intervalSeconds: HOURLY,
    });
    const page = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(topicNamed(page.rows, FRESH_NAME)).toStrictEqual(created);
  });

  it('writes into the domain the path addressed', async () => {
    // The `:slug` reached the WRITE rather than only a lookup: a
    // create stamping another domain answers a perfectly plausible
    // row and files it under configuration nobody asked about. The
    // name is one RADAR already researches, so a write landing
    // there would be REFUSED rather than merely misfiled — the
    // sharper failure, and the reason this name was chosen over a
    // free one.
    const planted = await plantTopics();

    await createTopic(planted.store, TRANSIT, {
      name: planted.inference.name,
      intervalSeconds: HOURLY,
    });

    const here = await listTopics(planted.store, TRANSIT, WIDE_WINDOW);
    const there = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(here.rows.map((row) => row.name))
      .toEqual(['edge inference', 'transformers']);
    expect(here.total).toBe(2);
    expect(there.rows)
      .toStrictEqual([planted.inference, planted.transformers]);
  });

  it('counts the new row in the total a page reports', async () => {
    // `total` is a second question rather than the length of the
    // rows in hand, so a create the count never saw would leave a
    // page claiming to be the whole of a domain it is not. Read
    // through a window of one, so the two numbers cannot agree by
    // accident.
    const planted = await plantTopics();

    await createTopic(planted.store, RADAR, {
      name: FRESH_NAME,
      intervalSeconds: HOURLY,
    });

    const page = await listTopics(planted.store, RADAR, {
      limit: 1,
      offset: 0,
    });

    expect(page.rows).toHaveLength(1);
    expect(page.total).toBe(3);
  });

  it('leaves the topics the domain already researched', async () => {
    // A write lands one row. The two the fixture planted are still
    // there and still say what they said, which no assertion over
    // the created row could report.
    const planted = await plantTopics();

    await createTopic(planted.store, RADAR, {
      name: FRESH_NAME,
      intervalSeconds: HOURLY,
    });

    const page = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(topicNamed(page.rows, 'transformers'))
      .toStrictEqual(planted.transformers);
    expect(topicNamed(page.rows, 'edge inference'))
      .toStrictEqual(planted.inference);
  });
});

// ---------------------------------------------------------------------------
// What a patch retunes
// ---------------------------------------------------------------------------

/**
 * The list a term patch writes in place of the stored one.
 *
 * Shares NO member with the two terms `transformers` was planted
 * with, and is SHORTER than them, so the three readings a merge
 * could be come apart: a union answers three terms, an append
 * answers three in the other order, and a replace answers this
 * one. A replacement sharing a member would leave the first two
 * satisfiable together.
 */
const REPLACED_TERMS = ['sparse attention'];

/** A floor above the one `edge inference` was planted with. */
const RAISED_FLOOR = 900;

/** A ceiling below the one it was planted with. */
const LOWERED_CEILING = 43200;

describe('what a patch retunes', () => {
  it('replaces the term list whole rather than merging into it', async () => {
    // Compared against the row as it was rather than field by
    // field: a patch reaching a second member answers a plausible
    // topic and quietly changes what a run issues.
    const planted = await plantTopics();
    const patched = await patchTopic(planted.store, planted.transformers.id, {
      searchTerms: REPLACED_TERMS,
    });

    expect(patched).toStrictEqual({
      ...planted.transformers,
      searchTerms: REPLACED_TERMS,
    });

    // The stored list was longer than the one that replaced it and
    // shared nothing with it, so a merge answers three here and an
    // append answers three the other way round.
    expect(planted.transformers.searchTerms).toHaveLength(2);
    expect(patched.searchTerms).toHaveLength(1);
  });

  it('stores the term list it replaced', async () => {
    // Read back through the list, so the claim is about the stored
    // row rather than about what the patch answered. A module
    // answering a row it never wrote passes the case above.
    const planted = await plantTopics();

    await patchTopic(planted.store, planted.transformers.id, {
      searchTerms: REPLACED_TERMS,
    });

    const page = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(topicNamed(page.rows, 'transformers')).toStrictEqual({
      ...planted.transformers,
      searchTerms: REPLACED_TERMS,
    });
  });

  it('drops a term by being sent the list without it', async () => {
    // The SUBSET reading, which the disjoint replacement above
    // cannot make: a caller sends the list it wants to exist, so
    // removing one term is sending the other. A store merging the
    // two answers both terms here and is indistinguishable from a
    // correct replace whenever the submitted list is a subset of
    // the stored one — which is the shape a caller who edited a
    // list actually sends.
    const planted = await plantTopics();
    const kept = planted.transformers.searchTerms.slice(0, 1);
    const patched = await patchTopic(planted.store, planted.transformers.id, {
      searchTerms: kept,
    });

    expect(patched.searchTerms).toEqual(kept);
    expect(patched.searchTerms).toHaveLength(1);
  });

  it('clears every term when the list it is sent is empty', async () => {
    // Read back through the LIST, which the empty-list control in
    // the body table above cannot: that one reads the row the
    // patch answered. An empty list is a complete value and the
    // only way to express having no terms at all, so a store
    // treating it as an absence leaves the stored terms standing
    // and answers a row that looks right.
    const planted = await plantTopics();

    await patchTopic(planted.store, planted.transformers.id, {
      searchTerms: [],
    });

    const page = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(topicNamed(page.rows, 'transformers').searchTerms).toEqual([]);
  });

  it('moves both interval bounds and leaves the cadence', async () => {
    // `edge inference` was planted with both bounds set, so this
    // is the write that moves them rather than the one that adds
    // them. `intervalSeconds` is in the compare by being absent
    // from the override: a patch writing the cadence from a bound
    // is a plausible row every bound-only read would pass.
    const planted = await plantTopics();
    const patched = await patchTopic(planted.store, planted.inference.id, {
      minIntervalSeconds: RAISED_FLOOR,
      maxIntervalSeconds: LOWERED_CEILING,
    });

    expect(patched).toStrictEqual({
      ...planted.inference,
      minIntervalSeconds: RAISED_FLOOR,
      maxIntervalSeconds: LOWERED_CEILING,
    });
    expect(planted.inference.minIntervalSeconds).not.toBe(RAISED_FLOOR);
    expect(planted.inference.maxIntervalSeconds).not.toBe(LOWERED_CEILING);
  });

  it('sets a bound on a topic that carried none', async () => {
    // The other transition, and the one the case above cannot
    // make: `transformers` was created with neither bound, so a
    // store treating a stored null as nothing to write passes the
    // move and fails this.
    const planted = await plantTopics();
    const patched = await patchTopic(planted.store, planted.transformers.id, {
      minIntervalSeconds: RAISED_FLOOR,
      maxIntervalSeconds: LOWERED_CEILING,
    });

    expect(planted.transformers.minIntervalSeconds).toBeNull();
    expect(planted.transformers.maxIntervalSeconds).toBeNull();
    expect(patched).toStrictEqual({
      ...planted.transformers,
      minIntervalSeconds: RAISED_FLOOR,
      maxIntervalSeconds: LOWERED_CEILING,
    });
  });

  it('moves one bound and leaves the other alone', async () => {
    // The two are separate members rather than a pair. A patch
    // writing both from whichever one was submitted answers a
    // plausible row, passes both cases above — they submit both —
    // and is reported by nothing else in this file.
    const planted = await plantTopics();
    const patched = await patchTopic(planted.store, planted.inference.id, {
      minIntervalSeconds: RAISED_FLOOR,
    });

    expect(patched).toStrictEqual({
      ...planted.inference,
      minIntervalSeconds: RAISED_FLOOR,
    });
    expect(patched.maxIntervalSeconds)
      .toBe(planted.inference.maxIntervalSeconds);
  });

  it('stores the bounds it moved', async () => {
    // Read back through the list. A patch answering bounds it
    // never wrote passes every case above.
    const planted = await plantTopics();

    await patchTopic(planted.store, planted.inference.id, {
      minIntervalSeconds: RAISED_FLOOR,
      maxIntervalSeconds: LOWERED_CEILING,
    });

    const page = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(topicNamed(page.rows, 'edge inference')).toStrictEqual({
      ...planted.inference,
      minIntervalSeconds: RAISED_FLOOR,
      maxIntervalSeconds: LOWERED_CEILING,
    });
  });

  it('retires a topic without deleting it', async () => {
    // `enabled` is the column the schema provides for taking a
    // topic out of scheduling, and this is the whole of what a
    // retirement writes: the subject, the terms and the cadence
    // stay, which is what makes it recoverable and what makes it
    // different from the delete below.
    const planted = await plantTopics();
    const patched = await patchTopic(planted.store, planted.inference.id, {
      enabled: false,
    });

    expect(planted.inference.enabled).toBe(true);
    expect(patched).toStrictEqual({ ...planted.inference, enabled: false });
  });

  it('keeps a retired topic on the page it was listed on', async () => {
    // `enabled` is not a filter on this read. A list quietly
    // hiding disabled rows would leave an operator with no way to
    // find the topic they had just switched off, and every count
    // in the refusal half of this file would still add up.
    const planted = await plantTopics();

    await patchTopic(planted.store, planted.inference.id, { enabled: false });

    const page = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.name))
      .toEqual(['edge inference', 'transformers']);
    expect(page.total).toBe(2);
    expect(topicNamed(page.rows, 'edge inference').enabled).toBe(false);
  });

  it('brings a retired topic back', async () => {
    // The member is not one-way, and this is what says so. A
    // service folding `enabled` through `||` rather than `??`
    // writes true for a submitted false and fails the retirement
    // above; one that had stopped writing the column at all passes
    // that case only while the stored value already differed, and
    // fails here.
    const planted = await plantTopics();

    await patchTopic(planted.store, planted.inference.id, { enabled: false });

    const revived = await patchTopic(planted.store, planted.inference.id, {
      enabled: true,
    });

    expect(revived).toStrictEqual(planted.inference);
  });

  it('retunes the topic it named and no other', async () => {
    // The whole of both domains read back: three topics, one term
    // list moved. A patch reaching more rows than the id it was
    // given answers the same row and is invisible to every case
    // above. The second domain is in the sweep because its topic
    // carries a name RADAR carries too, so a patch keyed on the
    // name rather than on the id would reach across the two.
    const planted = await plantTopics();

    await patchTopic(planted.store, planted.transformers.id, {
      searchTerms: REPLACED_TERMS,
    });

    const here = await listTopics(planted.store, RADAR, WIDE_WINDOW);
    const there = await listTopics(planted.store, TRANSIT, WIDE_WINDOW);

    expect(topicNamed(here.rows, 'edge inference'))
      .toStrictEqual(planted.inference);
    expect(there.rows).toStrictEqual([planted.foreign]);
  });
});

// ---------------------------------------------------------------------------
// What a delete takes
// ---------------------------------------------------------------------------

describe('what a delete takes', () => {
  it('answers nothing and leaves the sibling standing', async () => {
    // Nothing in schema v2 points at `topics`, so this delete has
    // neither a guard nor a confirmation to give it: the whole of
    // what it answers is nothing, and the whole of what it did is
    // read back off the page. The sibling is compared as a WHOLE
    // record — a delete that took the right row and edited the one
    // beside it answers the same page of names.
    const planted = await plantTopics();

    await expect(deleteTopic(planted.store, planted.transformers.id))
      .resolves.toBeUndefined();

    const page = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows).toStrictEqual([planted.inference]);
    expect(page.total).toBe(1);
  });

  it('leaves the second domain researching that name', async () => {
    // A topic in each domain is named `transformers`, so a delete
    // keyed on the name rather than on the id takes both and
    // passes any count that only looked at one of them.
    const planted = await plantTopics();

    await deleteTopic(planted.store, planted.transformers.id);

    const there = await listTopics(planted.store, TRANSIT, WIDE_WINDOW);

    expect(there.rows).toStrictEqual([planted.foreign]);
    expect(there.total).toBe(1);
  });

  it('answers 404 to a second delete of the same id', async () => {
    // The row is gone rather than merely unlisted, which no read
    // above can say: a delete that unlinked the row without
    // removing it answers this second call as a success.
    const planted = await plantTopics();

    await deleteTopic(planted.store, planted.transformers.id);

    const refusal = await refusalFrom(
      () => deleteTopic(planted.store, planted.transformers.id),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });

  it('frees the name the delete took out of the domain', async () => {
    // The natural key went with the row rather than outliving it,
    // which neither read above can say: an index keeping the entry
    // answers the same page and refuses this create as a
    // duplicate.
    const planted = await plantTopics();

    await deleteTopic(planted.store, planted.transformers.id);

    const created = await createTopic(planted.store, RADAR, {
      name: planted.transformers.name,
      intervalSeconds: HOURLY,
    });

    expect(created.name).toBe(planted.transformers.name);

    // A new row rather than the old one back: a sequence does not
    // roll back over a row that went, and the terms the deleted
    // topic issued did not come with the name.
    expect(created.id).not.toBe(planted.transformers.id);
    expect(created.searchTerms).toEqual([]);
  });
});
