/**
 * `src/subscriptions/service.ts` — what the four export
 * subscription operations refuse. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * TEN CLAIMS, AND EVERY ONE OF THEM IS ABOUT A REFUSAL. What these
 * operations LET THROUGH is the next task's half, and this one
 * carries only the CONTROLS a refusal needs to be readable: each is
 * varied along the one axis its refusal turns on, because a module
 * refusing everything passes every assertion a refusal case makes
 * on its own. The plan's six are the address, the connector, the
 * format, the triple, the pipeline-owned member and the id that
 * names nothing; the other four are the readings those six cannot
 * give on their own.
 *
 * THAT AN ADDRESS NAMING NOTHING IS A 404 ON ALL FOUR OPERATIONS,
 * and that the two addresses are told apart. A `:slug` naming no
 * domain and an `:id` naming no subscription are fixed in different
 * places, so a module answering one sentence to both would send an
 * operator to the wrong one — a distinction pinned without pinning
 * either wording, since the sentences are free to be reworded and
 * the difference is not.
 *
 * THAT A `connectorId` NAMING NO CONNECTOR IS A 422 AND NOT A 404,
 * from both writes that can carry one. This is the claim this group
 * has and no wave-1 group does: the id is a body member rather than
 * an address, so the refusal names `connectorId` in a detail a
 * caller can act on. `SubscriptionPatch` carries the member, so a
 * RE-POINT can name a connector that is not there exactly as a
 * create can, and the table drives both. Two controls sit beside it
 * and neither substitutes for the other: the same write naming a
 * connector that IS there, and a patch naming no connector at all —
 * which is what says the resolution is conditional rather than an
 * unconditional read of a member the request never sent.
 *
 * THAT THE TWO ORDERINGS ARE OPPOSITE, AND DELIBERATELY. A create
 * against an unknown slug carrying an unknown connector answers the
 * SLUG, and a patch against an unknown id carrying an unknown
 * connector answers the CONNECTOR. Neither is arbitrary: the create
 * resolves its address because the insert needs the domain id, and
 * the patch never resolves its address at all — the store answers
 * `null` at the write, which is last. Two cases pin the pair, and a
 * module that had folded them into one rule fails exactly one of
 * them.
 *
 * THAT A TRIPLE THE DOMAIN ALREADY SUBSCRIBES TO IS A 409 FROM BOTH
 * WRITES THAT CAN PROPOSE ONE. Two thirds of the natural key are
 * patchable, so a re-format and a re-point can collide as a create
 * can. `StoreRefusal` is deliberately not an `AppError`, so an
 * untranslated one answers 500; the cases pin the translation
 * rather than merely that something was thrown. Four controls
 * follow, and the last two are the ones the first two cannot stand
 * in for: the key is over a TRIPLE, so one domain taking one format
 * to two connectors and one taking two formats to one connector
 * both have to be accepted, and a service or a store holding any
 * PAIR of the three refuses one of them while passing every other
 * case in this file.
 *
 * THAT A BODY IS PARSED HERE, not above. Every row of the body
 * table is submitted to a SERVICE function rather than to a schema,
 * which is what says an MCP tool in wave 3 cannot be handed a
 * payload the HTTP route would have refused. Both operations that
 * take a body have rows of their own, since a row driven through
 * only one of them pins nothing about the other, and both orderings
 * are pinned: a malformed body outranks a slug that names nothing
 * AND an id that names nothing.
 *
 * THAT `format` IS HELD TO `EXPORT_FORMATS` AND THE TUPLE IS READ
 * AT RUNTIME. The rows submitting a format outside it are filtered
 * against the imported constant rather than against a list retyped
 * here, so a member ADDED to the tuple fails the guard — the row it
 * was named for having become legal — instead of leaving a case
 * asserting a refusal that is no longer one. The other direction is
 * a separate claim no refusal row can reach, and it is the
 * acceptance case that LOOPS the tuple: a schema narrowed to four
 * of five formats passes every refusal row here and fails only
 * that.
 *
 * THAT THE ENUM ANSWERS ONE CODE FOR THREE FAULTS. A format outside
 * the tuple, a format left off, and a format cleared with an
 * explicit `null` are all `invalid_value`, where a string member
 * would answer `invalid_type` for two of the three. That is
 * measured rather than assumed, and the three rows are kept apart
 * because the BODIES differ even where the detail does not: a
 * schema made optional passes the second and still refuses the
 * first.
 *
 * THAT `nextRunAt` IS REFUSED AS AN UNRECOGNIZED KEY ON BOTH
 * WRITES. It is `.strict()` doing its ordinary work rather than a
 * per-column check, which is the reason the refusal holds for a
 * column nobody has added yet — `domainId` and a member of another
 * table entirely are refused by the same clause and are in the
 * table for exactly that reason.
 *
 * THAT THE REASONS THIS PORT DECLARES ARE TOLD APART, INCLUDING THE
 * TWO ONLY A LOST RACE REACHES. Both writes resolve their parents
 * and only then write, so a foreign-key refusal means a row went
 * between the two — a state the ordinary fixture cannot produce and
 * which is therefore RECONSTRUCTED rather than stubbed: the parent
 * is really deleted, the lookup really answers the row it had, and
 * what the write meets is the store's own refusal. The insert
 * reaches two keys and answers the domain 404 to both, which is
 * this module's stated misattribution and is pinned as such rather
 * than left to a reader to discover; the update reaches one and
 * answers the same 422 the lookup does. Beside them sit the two
 * rethrow cases, which are what says a reason `SubscriptionStore`
 * does not declare answers 500 rather than a plausible status no
 * rule authorised.
 *
 * THAT NOTHING SUBMITTED COMES BACK. The containment block counts
 * occurrences of a sentinel in the serialised refusal rather than
 * asserting absence, and takes the same count over a planted
 * envelope — a search that would find nothing anywhere reports a
 * clean refusal and a leaking one alike. Its connector rows carry
 * the submitted ID as a needle, which is the value the one refusal
 * built by hand here is likeliest to quote and the only channel a
 * string sentinel cannot reach.
 *
 * Mutation legs, run over this file with `--reporter=json` and read
 * as the failed case SET rather than as a count, measured against
 * 90 cases. Twenty legs, eighteen aimed at
 * `src/subscriptions/service.ts` and two at
 * `tests/helpers/memory-research-store.ts`, because the natural key
 * is the STORE's and no leg over the service can reach it. Every
 * leg collected all 90 cases, which is what separates a leg that
 * legitimately reddened nothing from one whose edit broke
 * collection and scored zero identically.
 *
 * Collapsing the two 404 sentences into one reddens exactly 1, the
 * distinctness case, which is the narrowest reading in this file.
 *
 * THE FOUR CONNECTOR LEGS ARE TOLD APART BY WHICH SIDE OF THE
 * RESOLUTION EACH EDIT SITS ON. Answering the lookup a 404 instead
 * of a 422 reddens 4 — both refusal rows, the message case and the
 * patch ordering case. Dropping the resolution from the CREATE
 * reddens 2 and dropping it from the PATCH reddens 1, and the two
 * sets are disjoint, which says the two call sites are separately
 * pinned. The create's leg is 2 rather than 3 because a create with
 * no pre-flight read still answers 404 for a connector that is not
 * there — through the foreign key rather than the lookup — so the
 * ordering case is green under it, which is this module's stated
 * misattribution showing up as a leg that cannot reach it. Making
 * the patch's resolution UNCONDITIONAL reddens 10 across four
 * sections and is recorded as blunt rather than as coverage: a
 * lookup of `undefined` refuses every patch, so the one case named
 * for the conditional carries the claim and the other nine are the
 * fixture reporting.
 *
 * The two `.strict()` legs redden 4 apiece and their sets are
 * DISJOINT, which says the two schemas are separately pinned rather
 * than sharing one `parseBody` nobody would notice degrading. Each
 * is exactly its half's three undeclared-member rows plus that
 * half's containment row.
 *
 * The two numeric legs are two members held to one rule and they
 * redden disjoint sets. Relaxing the shared interval schema to
 * `.nonnegative()` reddens 5 — the zero row and the zero-floor row
 * on each operation, plus the patch ordering case, which submits a
 * zero of its own — and relaxing the connector id schema reddens 3,
 * the two zero rows plus the create ordering case. Neither reaches
 * the fractional or negative rows, which says `.int()` and
 * `.positive()` are separately pinned.
 *
 * THE TWO ENUM LEGS REDDEN DISJOINT SETS AND NEITHER DIRECTION IS
 * REACHABLE FROM THE OTHER. Narrowing the schema to four of the
 * five formats reddens exactly 1, the acceptance loop, and no
 * refusal row at all. Widening it to `z.string()` reddens 6, every
 * row whose expected code is `invalid_value` plus the create
 * ordering case — which is the three-faults-one-code claim paying
 * for itself, since the missing-member and explicit-null rows are
 * in that set and a string schema answers `invalid_type` to both.
 *
 * The triple legs nest. Rethrowing the unique refusal reddens 7 —
 * all three 409 cases, both read-back controls, the containment row
 * and the `cause` case — while answering that same refusal a 404
 * reddens a strict SUBSET of 3, the three 409 cases alone, because
 * a wrong status still leaves an `AppError` for the refusal helper
 * to hand back and every read-back control still sees a row nobody
 * wrote.
 *
 * The two lost-race legs redden disjoint sets, which is what makes
 * the insert's misattribution a decision this file pins rather than
 * a behaviour it inherits. Answering every foreign-key refusal as
 * the connector 422 reddens 3, all of them insert cases; answering
 * every one as the domain 404 reddens exactly 1, the patch case. A
 * module reading the constraint name — the design `./service.ts`
 * considered and did not take — fails the second of those three,
 * which is what makes the CONNECTOR-raced case worth having rather
 * than a transcription of what the code already does.
 *
 * Three legs redden exactly the one case each is aimed at.
 * Resolving the domain before parsing the create body reddens only
 * that ordering case; reading the connector before the domain
 * reddens only the create's both-wrong case; and answering an
 * undeclared reason a 409 rather than rethrowing it reddens only
 * the first rethrow case.
 *
 * The two store legs reach what no service mutation can, the key
 * being the STORE's. Keying it on `(domain, format)` reddens
 * exactly 2 — one of them the widening control that exists for it,
 * the other the format acceptance loop, which delivers five formats
 * to one connector. Keying it across every domain rather than
 * within one reddens 77 of 90 and is recorded rather than read: the
 * fixture plants a row carrying another domain's whole pair, so
 * `plantSubscriptions` cannot build its dataset at all under that
 * edit. That is the fixture's design reporting rather than any
 * case, and it is why the three explicit widening controls sit
 * beside it.
 *
 * What no module mutation reaches, by construction: the table
 * guards read only the tables beside them and are aimed at a later
 * edit, such as an operation added with no row or a body half
 * deleted whole. The planted containment control is invisible to
 * every leg for the same reason and deliberately so: it proves the
 * SEARCH, where the rethrow legs prove the SUBJECT.
 */

import type { SubscriptionServiceStore } from './service.js';
import type { SubscriptionRecord } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { ConnectorRecord } from '../connectors/store.js';
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
import { EXPORT_FORMATS } from '../db/schema/values.js';
import { StoreRefusal } from '../db/store-errors.js';

import {
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  patchSubscription,
} from './service.js';

/** The seeded worked example, and the domain every case stores. */
const RADAR = 'example-tech-radar';

/** A second domain, invented in the same neutral register. */
const TRANSIT = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const MISSING_SLUG = 'example-not-a-domain';

/** An id shaped like one and carried by no subscription here. */
const MISSING_ID = 9999;

/**
 * An id shaped like one and carried by no connector here.
 *
 * Distinct from {@link MISSING_ID}, and not because either would
 * do: the containment block below counts this number as a NEEDLE,
 * so a value that also stands for a missing subscription would make
 * one channel unreadable against the other.
 */
const MISSING_CONNECTOR_ID = 424242;

/**
 * A day, as the cadence every planted subscription delivers at.
 *
 * Named rather than repeated, so the interval rows below are the
 * only place a number is being ARGUED about: a fixture spelling
 * `86400` eight times invites a reader to wonder which of them the
 * boundary cases are varying.
 */
const DAILY = 86400;

/**
 * A window wider than any collection planted here.
 *
 * Wide on purpose, because a REFUSAL is the subject of every case
 * in this file: a window narrow enough to be interesting would make
 * every list refusal depend on where its rows happened to fall.
 * What the window ARRIVES as rather than what it selects is
 * `src/http/schemas.ts`'s claim, and what it SELECTS belongs to the
 * cases about what this module lets through.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * A format the tuple does not carry, shaped like one that could.
 *
 * Lower case with no separator, so what refuses it is the
 * membership rule rather than any narrowing of the string: a
 * sentinel shaped unlike a format would be testing a rule this
 * schema does not have.
 */
const UNKNOWN_FORMAT = 'csv';

/**
 * Two domains, two connectors, three subscriptions, and the store
 * holding them.
 *
 * The shape is chosen so that the three refusals that have to be
 * WIDENED against are planted rather than asserted. {@link feed}
 * takes a SECOND format to the connector {@link digest} already
 * delivers to, and {@link foreign} takes {@link digest}'s own
 * format to that same connector under the OTHER domain — so a store
 * or a service holding any pair of the triple cannot even build
 * this fixture, and every case in the file fails at its first line
 * rather than one case failing for the right reason. The explicit
 * widening controls below are what turn that blunt signal into
 * named ones.
 */
interface PlantedSubscriptions {
  /** The store, holding {@link RADAR} and {@link TRANSIT}. */
  readonly store: MemoryResearchStore;

  /**
   * The notebook connector all three planted subscriptions deliver
   * to, and so the one a duplicate collides at.
   */
  readonly vault: ConnectorRecord;

  /**
   * A second connector nothing planted delivers to, so a re-point
   * onto it is legal and a create naming it collides with nothing.
   */
  readonly inbox: ConnectorRecord;

  /**
   * A subscription of {@link RADAR}, the row every patch moves.
   */
  readonly digest: SubscriptionRecord;

  /**
   * A second subscription of {@link RADAR}, taking another format
   * to {@link vault}, and the triple a re-format collides with.
   */
  readonly feed: SubscriptionRecord;

  /**
   * A subscription of {@link TRANSIT} carrying {@link digest}'s
   * whole pair, which is the fixture asserting that the key is a
   * triple.
   */
  readonly foreign: SubscriptionRecord;
}

/**
 * Plants that shape through the service under test.
 *
 * Through {@link createSubscription} rather than through the store,
 * so every case starts from writes this module accepted. A planting
 * helper reaching past the subject would leave the whole file green
 * against a `createSubscription` that refused everything.
 *
 * The two connectors go in through the STORE, which is the one
 * place this file plants past a subject and is not an exception at
 * all: `ConnectorStore` is a different port with a service of its
 * own, and `src/connectors/service.test.ts` is where a connector
 * write is under test. What this file needs from them is that the
 * rows exist.
 *
 * @returns The store, the two connectors and the three rows.
 */
async function plantSubscriptions(): Promise<PlantedSubscriptions> {
  const store = createMemoryResearchStore();

  await store.insertDomain({ slug: RADAR, name: 'Radar', settings: {} });
  await store.insertDomain({ slug: TRANSIT, name: 'Transit', settings: {} });

  const vault = await store.insertConnector({
    kind: 'notebook',
    name: 'research vault',
    config: {},
  });
  const inbox = await store.insertConnector({
    kind: 'export_target',
    name: 'weekly inbox',
    config: {},
  });
  const digest = await createSubscription(store, RADAR, {
    format: 'obsidian_md',
    connectorId: vault.id,
    intervalSeconds: DAILY,
  });
  const feed = await createSubscription(store, RADAR, {
    format: 'rss',
    connectorId: vault.id,
    intervalSeconds: DAILY,
    minIntervalSeconds: 3600,
    maxIntervalSeconds: 604800,
  });
  const foreign = await createSubscription(store, TRANSIT, {
    format: 'obsidian_md',
    connectorId: vault.id,
    intervalSeconds: DAILY,
  });

  return { store, vault, inbox, digest, feed, foreign };
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
 * `message` is not among them for the details zod raised: their
 * wording is asserted in `src/http/validation.ts`. The connector
 * detail is this module's own and its message IS pinned, in the
 * case named for it, so nothing here is reading a sentence twice.
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

/**
 * @param body - A row's body.
 * @param key - The member to read.
 * @returns What the body carries under that key, or undefined. The
 *   companion to {@link bodyCarries}, for a guard that has to read
 *   a submitted VALUE rather than only ask whether one was sent.
 */
function bodyValue(body: unknown, key: string): unknown {
  return bodyCarries(body, key)
    ? (body as Record<string, unknown>)[key]
    : undefined;
}

// ---------------------------------------------------------------------------
// An address that names nothing
// ---------------------------------------------------------------------------

/** Every function this module exports. */
const OPERATIONS = [
  'createSubscription',
  'deleteSubscription',
  'listSubscriptions',
  'patchSubscription',
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
   * operations — a `:slug` that names no domain, and an `:id` that
   * names no subscription — and a caller has to be able to tell
   * which, since the two are fixed in different places.
   */
  readonly subject: 'domain' | 'subscription';

  /** The call that has to be refused. */
  readonly refuse: (planted: PlantedSubscriptions) => Promise<unknown>;

  /** The same call against an address that is there. */
  readonly control: (planted: PlantedSubscriptions) => Promise<unknown>;
}

/** Every operation that can be handed an address naming no row. */
const MISSING_CASES: readonly MissingCase[] = [
  {
    operation: 'listSubscriptions',
    subject: 'domain',
    refuse: ({ store }) => listSubscriptions(
      store,
      MISSING_SLUG,
      WIDE_WINDOW,
    ),
    control: ({ store }) => listSubscriptions(store, RADAR, WIDE_WINDOW),
  },
  {
    // The body is a legal one and names a connector that is there,
    // so what this row measures is the slug and nothing else. A row
    // sending a fault of its own would answer 422 and pass for a
    // 404 nobody checked.
    operation: 'createSubscription',
    subject: 'domain',
    refuse: ({ store, inbox }) => createSubscription(store, MISSING_SLUG, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    }),
    control: ({ store, inbox }) => createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    }),
  },
  {
    operation: 'patchSubscription',
    subject: 'subscription',
    refuse: ({ store }) => patchSubscription(store, MISSING_ID, {
      intervalSeconds: 900,
    }),
    control: ({ store, digest }) => patchSubscription(store, digest.id, {
      intervalSeconds: 900,
    }),
  },
  {
    operation: 'deleteSubscription',
    subject: 'subscription',
    refuse: ({ store }) => deleteSubscription(store, MISSING_ID),
    control: ({ store, digest }) => deleteSubscription(store, digest.id),
  },
];

describe('an address that names nothing', () => {
  it('covers every operation this module exports', () => {
    // Paired by name rather than by count, so a fifth operation
    // added to the module without a row here is this case failing
    // rather than a table that quietly covers four of five. The
    // run-now verb will owe a row here when it lands.
    expect(MISSING_CASES.map((row) => row.operation).sort())
      .toEqual([...OPERATIONS].sort());
  });

  it('carries rows for both addresses a path can name', () => {
    expect([...new Set(MISSING_CASES.map((row) => row.subject))].sort())
      .toEqual(['domain', 'subscription']);
  });

  for (const row of MISSING_CASES) {
    it(`answers 404 from ${row.operation}`, async () => {
      const planted = await plantSubscriptions();
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
      const planted = await plantSubscriptions();

      await expect(row.control(planted)).resolves.not.toThrow();
    });
  }

  it('says which of the two addresses was wrong', async () => {
    // Not a pin on the wording, which is free to change: a pin on
    // the DISTINCTION. A module answering one sentence to both
    // would send an operator to fix a slug when the id was the
    // fault, and is green against every case above.
    const planted = await plantSubscriptions();
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
      { subject: 'subscription', distinct: 1 },
    ]);

    const everySentence = [...said.values()].flatMap((seen) => [...seen]);

    expect(new Set(everySentence).size).toBe(2);
  });

  it('leaves the collection alone when it refuses', async () => {
    // A delete refused for naming nothing must not have taken
    // something else on the way past. Read back through the list,
    // not off the refusal.
    const planted = await plantSubscriptions();

    await refusalFrom(() => deleteSubscription(planted.store, MISSING_ID));

    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.format))
      .toEqual(['obsidian_md', 'rss']);
    expect(page.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// A connector the deployment does not carry
// ---------------------------------------------------------------------------

/**
 * The two writes that can carry a `connectorId`, and so the two
 * that can be refused for one.
 */
const CONNECTOR_OPERATIONS = ['create', 'patch'];

/** One write naming a connector that is not there. */
interface UnknownConnectorCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** Which operation is handed the id. */
  readonly operation: string;

  /** The write naming {@link MISSING_CONNECTOR_ID}. */
  readonly refuse: (planted: PlantedSubscriptions) => Promise<unknown>;
}

/**
 * Both ways a caller can name a connector the deployment does not
 * carry.
 *
 * BOTH ARE HERE BECAUSE BOTH CAN REACH THE READ.
 * `SubscriptionPatch` carries `connectorId`, so a re-point can name
 * a row that is not there exactly as a create can — and a re-point
 * is the likelier of the two in a deployment, since a destination
 * is chosen once and moved between services later.
 */
const UNKNOWN_CONNECTOR_CASES: readonly UnknownConnectorCase[] = [
  {
    label: 'a create delivering to a connector that is not there',
    operation: 'create',
    refuse: ({ store }) => createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: MISSING_CONNECTOR_ID,
      intervalSeconds: DAILY,
    }),
  },
  {
    label: 'a re-point onto a connector that is not there',
    operation: 'patch',
    refuse: ({ store, digest }) => patchSubscription(store, digest.id, {
      connectorId: MISSING_CONNECTOR_ID,
    }),
  },
];

describe('a connector the deployment does not carry', () => {
  it('carries rows for both writes that can name one', () => {
    expect([...new Set(
      UNKNOWN_CONNECTOR_CASES.map((row) => row.operation),
    )].sort()).toEqual([...CONNECTOR_OPERATIONS].sort());
  });

  for (const row of UNKNOWN_CONNECTOR_CASES) {
    it(`answers 422 to ${row.label}`, async () => {
      // A 422 rather than a 404, because the id is a body member
      // and not an address: what the caller can act on is being
      // told WHICH member named nothing.
      const planted = await plantSubscriptions();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual([{ field: 'connectorId', code: 'unknown_connector' }]);
    });
  }

  it('says the connector is not there, and nothing else', async () => {
    // The one detail this module builds by hand rather than
    // reading off zod, so its message is pinned here and not in
    // `src/http/validation.ts`. The id is deliberately absent from
    // it; the containment block below is what measures that.
    const { store } = await plantSubscriptions();
    const refusal = await refusalFrom(() => createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: MISSING_CONNECTOR_ID,
      intervalSeconds: DAILY,
    }));
    const details = (refusal.details ?? []) as FieldError[];

    expect(refusal.message).toBe('Validation failed');
    expect(details.map((detail) => detail.message))
      .toEqual(['No connector carries that id']);
  });

  it('creates against a connector the deployment carries', async () => {
    // The narrow control: a module refusing every create passes
    // the create row above and fails this one.
    const { store, inbox } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    });

    expect(created.connectorId).toBe(inbox.id);
  });

  it('re-points onto a connector the deployment carries', async () => {
    // The same control for the other write. The two are separate
    // cases because the two call sites are separate, and a module
    // that had stopped resolving on one of them passes the other.
    const { store, digest, inbox } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {
      connectorId: inbox.id,
    });

    expect(patched.connectorId).toBe(inbox.id);
    expect(patched.id).toBe(digest.id);
  });

  it('patches a row without naming a connector at all', async () => {
    // The control that says the resolution is CONDITIONAL. A
    // module reading a connector on every patch would have to get
    // the id from somewhere, and the only place is the stored row
    // — a read this port does not offer the patch. What reports
    // that here is a patch naming no connector answering at all.
    const { store, digest } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {
      intervalSeconds: 900,
    });

    expect(patched.intervalSeconds).toBe(900);
    expect(patched.connectorId).toBe(digest.connectorId);
  });

  it('leaves the row pointed where it was when it refuses', async () => {
    // Read back through the list rather than off the refusal: a
    // resolution that answered 422 after writing would satisfy
    // every assertion above.
    const planted = await plantSubscriptions();

    await refusalFrom(() => patchSubscription(
      planted.store,
      planted.digest.id,
      { connectorId: MISSING_CONNECTOR_ID },
    ));

    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.connectorId))
      .toEqual([planted.vault.id, planted.vault.id]);
  });

  it('answers the slug when a create gets both wrong', async () => {
    // The create resolves its address before its connector, so an
    // unknown connector under an unknown slug answers the SLUG. It
    // is not a precedence choice: the insert needs the domain id,
    // so that read has to happen and happens first.
    const { store } = await plantSubscriptions();
    const refusal = await refusalFrom(
      () => createSubscription(store, MISSING_SLUG, {
        format: 'pdf',
        connectorId: MISSING_CONNECTOR_ID,
        intervalSeconds: DAILY,
      }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });

  it('answers the connector when a patch gets both wrong', async () => {
    // The opposite ordering, and deliberately: the patch resolves
    // no address at all, the store answering `null` at the write,
    // so the connector read is what comes first. A module that had
    // folded the two orderings into one rule fails this case or
    // the one above, and no other case in this file reports it.
    const { store } = await plantSubscriptions();
    const refusal = await refusalFrom(
      () => patchSubscription(store, MISSING_ID, {
        connectorId: MISSING_CONNECTOR_ID,
      }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'connectorId', code: 'unknown_connector' }]);
  });
});

// ---------------------------------------------------------------------------
// A triple the domain already subscribes to
// ---------------------------------------------------------------------------

/**
 * The two writes that can propose a triple, and so the two that can
 * be refused for one.
 *
 * BOTH ARE HERE BECAUSE BOTH CAN REACH THE KEY. `SubscriptionPatch`
 * carries `format` and `connectorId`, two of the three columns the
 * key is over, so a table driven through the create alone would
 * leave the update's translation pinned by nothing — and either
 * patch reaches the key from a different direction, which is why
 * there are two patch rows rather than one.
 */
interface DuplicateCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The write proposing a triple the domain already subscribes to. */
  readonly refuse: (planted: PlantedSubscriptions) => Promise<unknown>;
}

/** Every way a caller can propose a triple that is taken. */
const DUPLICATE_CASES: readonly DuplicateCase[] = [
  {
    label: 'a create of a format the domain takes there already',
    refuse: ({ store, digest, vault }) => createSubscription(store, RADAR, {
      format: digest.format,
      connectorId: vault.id,
      intervalSeconds: DAILY,
    }),
  },
  {
    label: 'a re-format onto a triple the domain carries',
    refuse: ({ store, digest, feed }) => patchSubscription(store, digest.id, {
      format: feed.format,
    }),
  },
  {
    label: 'a re-point onto a triple the domain carries',
    refuse: async (planted) => {
      // The other third of the key, reached by moving a row's
      // DESTINATION rather than its format. Staged in two steps
      // because the fixture holds no pair a single re-point would
      // collide with: `digest` is moved out to the second
      // connector, a row is created in its place, and the re-point
      // back is what meets the key.
      await patchSubscription(planted.store, planted.digest.id, {
        connectorId: planted.inbox.id,
      });
      await createSubscription(planted.store, RADAR, {
        format: planted.digest.format,
        connectorId: planted.vault.id,
        intervalSeconds: DAILY,
      });

      return patchSubscription(planted.store, planted.digest.id, {
        connectorId: planted.vault.id,
      });
    },
  },
];

describe('a triple the domain already subscribes to', () => {
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
      const planted = await plantSubscriptions();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal.code).toBe('CONFLICT');
      expect(refusal.statusCode).toBe(409);

      // No `details`: the refusal is one fact, and the per-table
      // counts a connector delete carries have no analogue here.
      expect(refusal.details).toBeUndefined();
    });
  }

  it('takes a format the domain does not take there yet', async () => {
    // The narrow control: a module refusing every create passes
    // the create row above and fails this one.
    const { store, vault } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: vault.id,
      intervalSeconds: DAILY,
    });

    expect(created.format).toBe('pdf');
  });

  it('re-formats onto a triple the domain does not carry', async () => {
    // The same control for the other write. The two are separate
    // cases because the two translations are separate call sites,
    // and a module that had stopped translating one of them passes
    // the other.
    const { store, digest } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {
      format: 'pdf',
    });

    expect(patched.format).toBe('pdf');
    expect(patched.id).toBe(digest.id);
  });

  it('takes one format to a second connector', async () => {
    // The first WIDENING control, and one of the two the narrow
    // controls cannot stand in for: the key is over a TRIPLE, so a
    // domain delivering one format to two destinations is
    // ordinary. A service or a store holding the key over
    // `(domain, format)` refuses this and passes every case above.
    const { store, digest, inbox } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: digest.format,
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    });

    expect(created.format).toBe(digest.format);
    expect(created.connectorId).toBe(inbox.id);
  });

  it('takes a second format to one connector', async () => {
    // The other pair, held over `(domain, connector)`. The
    // fixture already plants one such row, so this reads the rule
    // through a write of its own rather than through a row that
    // was there when the case started.
    const { store, vault } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: vault.id,
      intervalSeconds: DAILY,
    });

    expect(created.connectorId).toBe(vault.id);
    expect(created.format).toBe('pdf');
  });

  it('takes the same pair under a second domain', async () => {
    // The third pair, `(format, connector)`, and the one a key
    // held across the table rather than within a domain refuses.
    // The fixture plants a row exactly like this one, which is
    // what makes a globally-held key fail at the first line of
    // every case rather than here; this reads it through a write.
    const planted = await plantSubscriptions();
    const created = await createSubscription(planted.store, TRANSIT, {
      format: planted.feed.format,
      connectorId: planted.vault.id,
      intervalSeconds: DAILY,
    });

    expect(created.format).toBe(planted.feed.format);
    expect(created.domainId).not.toBe(planted.feed.domainId);
  });

  it('leaves a row holding the triple it already had', async () => {
    // A row is not in conflict with itself: a patch naming the
    // format and the connector the addressed row already carries
    // is a no-op and not a 409. A store checking the resulting
    // triple without excluding the row being written refuses this,
    // and nothing else in the file reports it.
    const { store, digest } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {
      format: digest.format,
      connectorId: digest.connectorId,
    });

    expect(patched).toStrictEqual(digest);
  });

  it('leaves both rows standing when it refuses a re-format', async () => {
    // Read back through the list rather than off the refusal: a
    // translation that answered 409 after writing would satisfy
    // every assertion above.
    const planted = await plantSubscriptions();

    await refusalFrom(() => patchSubscription(
      planted.store,
      planted.digest.id,
      { format: planted.feed.format },
    ));

    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.format))
      .toEqual(['obsidian_md', 'rss']);
  });

  it('keeps the refusal off the second domain', async () => {
    // The create below was refused; the other domain's
    // subscription carrying that same pair is untouched, which is
    // the widening control restated over a refusal rather than an
    // acceptance.
    const planted = await plantSubscriptions();

    await refusalFrom(() => createSubscription(planted.store, RADAR, {
      format: planted.digest.format,
      connectorId: planted.vault.id,
      intervalSeconds: DAILY,
    }));

    const page = await listSubscriptions(planted.store, TRANSIT, WIDE_WINDOW);

    expect(page.rows.map((row) => row.id)).toEqual([planted.foreign.id]);
  });
});

// ---------------------------------------------------------------------------
// The bodies these operations refuse
// ---------------------------------------------------------------------------

/** The two operations {@link BODY_CASES} covers. */
const BODY_OPERATIONS = ['create', 'patch'];

/**
 * The columns this table's pipeline writes and this surface never
 * accepts, plus one a sibling table carries.
 *
 * `nextRunAt` is `export_subscriptions`'s own: `ar-dispatch` writes
 * it inside the claim it reschedules with, and the only door onto
 * it from here is the run-now verb that lands beside these four.
 * `flagged` is not a column of this table at all — it is a source's
 * — and it is here for exactly that reason: the refusal is
 * `.strict()` doing its ordinary work rather than a per-column
 * check, so a member no table carries is refused by the same clause
 * that refuses one another table does.
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
 * The bodies the two writes have to refuse.
 *
 * Both carry rows of their own rather than sharing them. They run
 * through one `parseBody`, so a mutation degrading that function
 * reddens both halves equally and a table driven through one of
 * them would pin only that the two share an implementation — while
 * the two schemas genuinely differ, `format`, `connectorId` and
 * `intervalSeconds` being required by one and optional on the
 * other.
 *
 * Every row here is submitted to a SERVICE function rather than to
 * a schema, which is the point: it is what says an MCP tool in wave
 * 3 cannot be handed a body the HTTP route would have refused.
 *
 * THE FORMAT ROWS ARE THREE CLAIMS UNDER ONE CODE. An enum answers
 * `invalid_value` for a member outside the tuple, for an ABSENT
 * member and for an explicit `null` alike — measured through
 * `parseBody` rather than assumed, and where a plain string would
 * answer `invalid_type` for two of the three. The three rows are
 * kept because the BODIES differ even where the detail does not: a
 * schema made optional accepts the second and still refuses the
 * first, and no other row here would report it.
 *
 * THE CADENCE ROWS DISTINGUISH TWO FAULTS THAT READ ALIKE. Zero and
 * a negative are `too_small`, which is `.positive()` answering; a
 * fraction is `invalid_type`, which is `.int()` answering before
 * it. Both are wanted and neither substitutes for the other: a
 * schema that had kept `.int()` and dropped `.positive()` accepts
 * the zero row while still refusing the fraction. The `connectorId`
 * rows repeat the pair on a member whose refusal for SHAPE has to
 * stay distinct from its refusal for naming nothing — the two
 * answer different codes at the same field, which is the whole
 * reason the hand-built one carries a code of its own.
 *
 * There is no open record on this surface, so no row carries a `*`
 * and no call below passes `openPaths`. A subscription body is six
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
    label: 'a create body carrying none of the three required',
    operation: 'create',
    body: {},
    details: [
      { field: 'format', code: 'invalid_value' },
      { field: 'connectorId', code: 'invalid_type' },
      { field: 'intervalSeconds', code: 'invalid_type' },
    ],
  },
  {
    label: 'a create body rendering a format nothing renders',
    operation: 'create',
    body: { format: UNKNOWN_FORMAT, connectorId: 1, intervalSeconds: DAILY },
    details: [{ field: 'format', code: 'invalid_value' }],
  },
  {
    label: 'a create body leaving the format off',
    operation: 'create',
    body: { connectorId: 1, intervalSeconds: DAILY },
    details: [{ field: 'format', code: 'invalid_value' }],
  },
  {
    label: 'a create body leaving the connector off',
    operation: 'create',
    body: { format: 'pdf', intervalSeconds: DAILY },
    details: [{ field: 'connectorId', code: 'invalid_type' }],
  },
  {
    label: 'a create body delivering every zero seconds',
    operation: 'create',
    body: { format: 'pdf', connectorId: 1, intervalSeconds: 0 },
    details: [{ field: 'intervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a create body delivering every minus day',
    operation: 'create',
    body: { format: 'pdf', connectorId: 1, intervalSeconds: -DAILY },
    details: [{ field: 'intervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a create body delivering every second and a half',
    operation: 'create',
    body: { format: 'pdf', connectorId: 1, intervalSeconds: 1.5 },
    details: [{ field: 'intervalSeconds', code: 'invalid_type' }],
  },
  {
    label: 'a create body naming connector zero',
    operation: 'create',
    body: { format: 'pdf', connectorId: 0, intervalSeconds: DAILY },
    details: [{ field: 'connectorId', code: 'too_small' }],
  },
  {
    label: 'a create body naming a connector by name',
    operation: 'create',
    body: {
      format: 'pdf',
      connectorId: 'research vault',
      intervalSeconds: DAILY,
    },
    details: [{ field: 'connectorId', code: 'invalid_type' }],
  },
  {
    label: 'a create body flooring at zero seconds',
    operation: 'create',
    body: {
      format: 'pdf',
      connectorId: 1,
      intervalSeconds: DAILY,
      minIntervalSeconds: 0,
    },
    details: [{ field: 'minIntervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a create body scheduling its own first delivery',
    operation: 'create',
    body: {
      format: 'pdf',
      connectorId: 1,
      intervalSeconds: DAILY,
      nextRunAt: '2026-08-31T09:00:00.000Z',
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body naming its own domain',
    operation: 'create',
    body: {
      format: 'pdf',
      connectorId: 1,
      intervalSeconds: DAILY,
      domainId: 1,
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body flagging itself',
    operation: 'create',
    body: {
      format: 'pdf',
      connectorId: 1,
      intervalSeconds: DAILY,
      flagged: true,
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
    label: 'a patch rendering a format nothing renders',
    operation: 'patch',
    body: { format: UNKNOWN_FORMAT },
    details: [{ field: 'format', code: 'invalid_value' }],
  },
  {
    label: 'a patch clearing the format with null',
    operation: 'patch',
    body: { format: null },
    details: [{ field: 'format', code: 'invalid_value' }],
  },
  {
    label: 'a patch delivering every zero seconds',
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
    label: 'a patch naming connector zero',
    operation: 'patch',
    body: { connectorId: 0 },
    details: [{ field: 'connectorId', code: 'too_small' }],
  },
  {
    label: 'a patch clearing the connector with null',
    operation: 'patch',
    body: { connectorId: null },
    details: [{ field: 'connectorId', code: 'invalid_type' }],
  },
  {
    label: 'a patch flooring at zero seconds',
    operation: 'patch',
    body: { minIntervalSeconds: 0 },
    details: [{ field: 'minIntervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a patch moving its own next delivery',
    operation: 'patch',
    body: { nextRunAt: '2026-08-31T09:00:00.000Z' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch proposing a move between domains',
    operation: 'patch',
    body: { domainId: 2 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch clearing the flag',
    operation: 'patch',
    body: { flagged: false },
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
  planted: PlantedSubscriptions,
  row: BodyCase,
): Promise<unknown> {
  return row.operation === 'create'
    ? createSubscription(planted.store, RADAR, row.body)
    : patchSubscription(planted.store, planted.digest.id, row.body);
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
      'invalid_type', 'invalid_value', 'too_small', 'unrecognized_keys',
    ]);
  });

  it('submits a format the tuple does not carry', () => {
    // Read off the imported tuple rather than off a list retyped
    // here, which makes the guard two-directional for free: a
    // format ADDED to `EXPORT_FORMATS` fails this case — the row
    // it was named for having become a legal request — instead of
    // leaving a case asserting a refusal that is no longer one.
    const outside = BODY_CASES.filter((row) => {
      const format = bodyValue(row.body, 'format');

      return typeof format === 'string'
        && !(EXPORT_FORMATS as readonly string[]).includes(format);
    });

    expect(outside.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS].sort());
    expect([...new Set(outside.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))]).toEqual(['invalid_value']);
  });

  it('refuses a cadence of zero from both operations', () => {
    // The scoped claim, held against the table rather than against
    // a memory of what was written into it: a row deleted from
    // either half stops this file covering the refusal it is named
    // for, and nothing else here would report it. Read off the
    // BODY rather than the label, so renaming a row cannot satisfy
    // this.
    const zeroed = BODY_CASES.filter(
      (row) => bodyValue(row.body, 'intervalSeconds') === 0,
    );

    expect(zeroed.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS].sort());
    expect(zeroed.every((row) => row.details.length === 1)).toBe(true);
    expect([...new Set(zeroed.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))]).toEqual(['too_small']);
  });

  it('refuses a connector id for its shape from both', () => {
    // The rows that make the hand-built refusal readable: this
    // member is refused at the same FIELD for two different
    // reasons, so a caller branching on the field alone could not
    // tell a malformed id from one that named nothing. What tells
    // them apart is the code, and these rows are the half of that
    // pair the schema owns.
    const shaped = BODY_CASES.filter(
      (row) => bodyCarries(row.body, 'connectorId')
        && row.details.some((detail) => detail.field === 'connectorId'),
    );

    expect(shaped.map((row) => row.operation).sort())
      .toEqual(['create', 'create', 'patch', 'patch']);
    expect([...new Set(shaped.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))].sort()).toEqual(['invalid_type', 'too_small']);
  });

  it('refuses every pipeline-owned member from both', () => {
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
      const planted = await plantSubscriptions();
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
    // module refusing every body passes all twenty-five rows above
    // and fails this.
    const { store, digest, inbox } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
      enabled: false,
      minIntervalSeconds: 3600,
      maxIntervalSeconds: 604800,
    });
    const patched = await patchSubscription(store, digest.id, {
      format: 'email_draft',
      connectorId: inbox.id,
      intervalSeconds: 1800,
      enabled: false,
      minIntervalSeconds: 300,
      maxIntervalSeconds: 43200,
    });

    expect(created.format).toBe('pdf');
    expect(patched.format).toBe('email_draft');
  });

  it('accepts every format the tuple carries', async () => {
    // The other direction of the enum, and the one no refusal row
    // can reach: narrowing the schema to four of the five formats
    // passes every row above and fails only this. Looped over the
    // runtime tuple, so a format added to `EXPORT_FORMATS` is
    // covered the day it lands.
    const { store, inbox } = await plantSubscriptions();
    const landed: string[] = [];

    for (const format of EXPORT_FORMATS) {
      const created = await createSubscription(store, TRANSIT, {
        format,
        connectorId: inbox.id,
        intervalSeconds: DAILY,
      });

      landed.push(created.format);
    }

    expect(landed).toEqual([...EXPORT_FORMATS]);
    expect(EXPORT_FORMATS.length).toBeGreaterThan(1);
  });

  it('accepts a cadence of one second from both', async () => {
    // The boundary control for the zero rows, a single step from
    // the value they refuse. A schema that had stopped checking
    // the interval at all passes those rows' neighbours and fails
    // them; a schema refusing every interval passes them and fails
    // this. Neither reading is available from one of the two.
    const { store, digest, inbox } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: 1,
    });
    const patched = await patchSubscription(store, digest.id, {
      intervalSeconds: 1,
    });

    expect(created.intervalSeconds).toBe(1);
    expect(patched.intervalSeconds).toBe(1);
  });

  it('accepts a bound cleared with null from the patch', async () => {
    // The control for the two nullable members, and the one the
    // cadence rows cannot stand in for: `intervalSeconds` refuses
    // a null and a bound accepts one, because clearing a floor is
    // expressible in no other way. A patch schema that dropped
    // `.nullable()` from the bounds passes every row above and
    // fails only this.
    const { store, feed } = await plantSubscriptions();
    const patched = await patchSubscription(store, feed.id, {
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    });

    expect(patched.minIntervalSeconds).toBeNull();
    expect(patched.maxIntervalSeconds).toBeNull();
  });

  it('accepts a patch that carries no member at all', async () => {
    // The port's rule rather than this module's:
    // `export_subscriptions` has no `updated_at`, so an empty
    // patch has nothing to set and answers the stored row. A
    // schema making any member required refuses this and passes
    // every row above.
    const { store, digest } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {});

    expect(patched).toStrictEqual(digest);
  });

  it('refuses a malformed patch against an id that is not', async () => {
    // The body is parsed before the id is resolved, so the same
    // patch answers the same refusal either way. A module
    // resolving first would answer this 404 and the matching row
    // above 422, which would make a caller's error depend on rows
    // it never asked about.
    const { store } = await plantSubscriptions();
    const refusal = await refusalFrom(
      () => patchSubscription(store, MISSING_ID, { intervalSeconds: 0 }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'intervalSeconds', code: 'too_small' }]);
  });

  it('refuses a malformed create against a slug that is not', async () => {
    // The same ordering claim on the other operation.
    // `createSubscription` parses, then resolves the domain, so a
    // body fault outranks a slug that names nothing.
    const { store } = await plantSubscriptions();
    const refusal = await refusalFrom(
      () => createSubscription(store, MISSING_SLUG, {
        format: UNKNOWN_FORMAT,
        connectorId: 0,
        intervalSeconds: DAILY,
      }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([
        { field: 'format', code: 'invalid_value' },
        { field: 'connectorId', code: 'too_small' },
      ]);
  });
});

// ---------------------------------------------------------------------------
// What only a lost race can produce
// ---------------------------------------------------------------------------

describe('what only a lost race can produce', () => {
  it('answers 404 when the domain went between the two', async () => {
    // The first of the two branches the ordinary fixture cannot
    // reach: `createSubscription` resolves the domain and only
    // then writes, so a foreign-key refusal means the row was
    // deleted in between. Reconstructed rather than stubbed — the
    // domain is really removed, and the lookup really answers the
    // row it had — so what the write meets is the store's own
    // refusal. The answer is the same 404 the lookup itself
    // raises, because it is the same fact.
    const { store, inbox } = await plantSubscriptions();
    const found = await store.findDomainBySlug(RADAR);

    if (found === null) {
      throw new Error('the fixture planted no domain to capture');
    }

    await store.deleteDomain(found.id);

    const vanished: SubscriptionServiceStore = {
      ...store,
      findDomainBySlug: async () => found,
    };
    const refusal = await refusalFrom(
      () => createSubscription(vanished, RADAR, {
        format: 'pdf',
        connectorId: inbox.id,
        intervalSeconds: DAILY,
      }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
  });

  it('answers 404 rather than the 409 a taken triple gets', async () => {
    // The narrow claim inside the case above: two of the reasons
    // `SubscriptionStore` declares are told apart. A translator
    // keying on `instanceof StoreRefusal` alone would answer one
    // status to both, and would pass every duplicate case here.
    //
    // The domain is deleted, which takes its subscriptions with it
    // through the cascade, so the triple this create proposes is
    // free by the time the write runs — and it is still the triple
    // the fixture collided on, which is what makes the two
    // refusals genuinely competing for this one call.
    const { store, digest, vault } = await plantSubscriptions();
    const found = await store.findDomainBySlug(RADAR);

    if (found === null) {
      throw new Error('the fixture planted no domain to capture');
    }

    await store.deleteDomain(found.id);

    const vanished: SubscriptionServiceStore = {
      ...store,
      findDomainBySlug: async () => found,
    };
    const refusal = await refusalFrom(
      () => createSubscription(vanished, RADAR, {
        format: digest.format,
        connectorId: vault.id,
        intervalSeconds: DAILY,
      }),
    );

    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.code).not.toBe('CONFLICT');
  });

  it('answers the insert 404 when the CONNECTOR raced', async () => {
    // The module's stated misattribution, pinned as one rather
    // than left for a reader to discover. Two foreign keys reach
    // the insert and this layer reads no constraint name, so both
    // answer the domain sentence — which is wrong here and errs in
    // the safer direction: a caller told its address is gone
    // re-reads the address, where a caller told its body is wrong
    // when the domain died would go looking at a member that was
    // correct. What names the truth is the `cause`, and its
    // constraint is read below so a change of mind here is a
    // failing case rather than a silent widening.
    const { store, inbox } = await plantSubscriptions();

    await store.deleteConnector(inbox.id);

    const vanished: SubscriptionServiceStore = {
      ...store,
      findConnectorById: async () => inbox,
    };
    const refusal = await refusalFrom(
      () => createSubscription(vanished, RADAR, {
        format: 'pdf',
        connectorId: inbox.id,
        intervalSeconds: DAILY,
      }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
    expect((refusal.cause as StoreRefusal).constraint)
      .toBe('export_subscriptions_connector_id_connectors_id_fk');
  });

  it('answers the patch 422 when the connector raced', async () => {
    // The other side of that pair, and the reason the insert's
    // misattribution is not a rule this module holds: an update
    // reaches ONE foreign key, `domainId` not being patchable, so
    // there is nothing to tell apart and the refusal is answered
    // as what it is. It is the same 422 the pre-flight read
    // raises, which is what makes that read a convenience rather
    // than a second rule.
    const { store, digest, inbox } = await plantSubscriptions();

    await store.deleteConnector(inbox.id);

    const vanished: SubscriptionServiceStore = {
      ...store,
      findConnectorById: async () => inbox,
    };
    const refusal = await refusalFrom(
      () => patchSubscription(vanished, digest.id, { connectorId: inbox.id }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'connectorId', code: 'unknown_connector' }]);
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
  });

  it('rethrows a reason this port does not declare', async () => {
    // Both schemas hold `format` to the tuple
    // `export_subscriptions_format_check` is generated from, so a
    // `check-violation` out of a write here means the two have
    // drifted apart. It is rethrown as itself, which answers 500,
    // rather than a plausible status no rule authorised. A
    // translator with a catch-all branch passes every other case
    // here and fails this.
    const { store, inbox } = await plantSubscriptions();
    const misbehaving: SubscriptionServiceStore = {
      ...store,
      insertSubscription: async () => {
        throw new StoreRefusal({
          reason: 'check-violation',
          constraint: 'export_subscriptions_format_check',
        });
      },
    };

    await expect(createSubscription(misbehaving, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    })).rejects.toBeInstanceOf(StoreRefusal);
  });

  it('rethrows an error that is not a store refusal', async () => {
    // The other half of the same rule, on the other write. A
    // driver fault is not a decision about rows, so nothing here
    // dresses it as one.
    const { store, digest } = await plantSubscriptions();
    const misbehaving: SubscriptionServiceStore = {
      ...store,
      updateSubscription: async () => {
        throw new TypeError('the driver failed on its own account');
      },
    };

    await expect(patchSubscription(misbehaving, digest.id, {
      intervalSeconds: 900,
    })).rejects.toBeInstanceOf(TypeError);
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/** A slug shaped like one, so it reaches the store rather than the parser. */
const SENTINEL_SLUG = 'sentinel-slug-value';

/** A key no schema here declares, submitted as one. */
const SENTINEL_MEMBER = 'sentinelMemberValue';

/** A value, submitted under that undeclared key. */
const SENTINEL_VALUE = 'sentinel value under a key';

/**
 * The id {@link MISSING_CONNECTOR_ID} is spelled as, so the one
 * refusal this module builds by hand can be searched for the number
 * it was given.
 *
 * A NUMBER RATHER THAN A STRING, and it is the needle the other
 * three cannot stand in for: the connector refusal is the only
 * detail on this surface whose message is this module's own, and
 * the only value it could quote is an id. Nothing else in a refusal
 * envelope here is numeric, so a count against this cannot be
 * satisfied by anything else in the text.
 */
const SENTINEL_ID = String(MISSING_CONNECTOR_ID);

/**
 * The four strings the rows below submit. None is a substring of
 * another, so a count against one cannot be satisfied by another.
 */
const SENTINELS = [
  SENTINEL_SLUG,
  SENTINEL_MEMBER,
  SENTINEL_VALUE,
  SENTINEL_ID,
];

/** One refused request, and what it submitted that must not return. */
interface ContainmentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The call, submitting the needles below. */
  readonly run: (planted: PlantedSubscriptions) => Promise<unknown>;

  /** The submitted strings the answer must not carry. */
  readonly needles: readonly string[];
}

/**
 * Every channel a submitted string could come back through.
 *
 * THE TWO CONNECTOR ROWS ARE THE ONES THIS GROUP HAS AND ITS
 * SIBLINGS DO NOT. Every other refusal here is built from a
 * constant or handed back by `src/http/validation.ts`, whose own
 * containment is measured in that module; the `connectorId` detail
 * is assembled in `./service.ts` from a message, a field name and a
 * code, and the id is the value sitting a line away from all three.
 */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a slug that names no domain',
    run: ({ store }) => listSubscriptions(store, SENTINEL_SLUG, WIDE_WINDOW),
    needles: [SENTINEL_SLUG],
  },
  {
    label: 'a create against a slug that names no domain',
    run: ({ store, inbox }) => createSubscription(store, SENTINEL_SLUG, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    }),
    needles: [SENTINEL_SLUG],
  },
  {
    label: 'a create naming a connector that is not there',
    run: ({ store }) => createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: MISSING_CONNECTOR_ID,
      intervalSeconds: DAILY,
    }),
    needles: [SENTINEL_ID],
  },
  {
    label: 'a re-point onto a connector that is not there',
    run: ({ store, digest }) => patchSubscription(store, digest.id, {
      connectorId: MISSING_CONNECTOR_ID,
    }),
    needles: [SENTINEL_ID],
  },
  {
    label: 'a create of a triple the domain carries',
    run: ({ store, digest, vault }) => createSubscription(store, RADAR, {
      format: digest.format,
      connectorId: vault.id,
      intervalSeconds: DAILY,
    }),
    needles: [SENTINEL_ID],
  },
  {
    label: 'an undeclared member of a create body',
    run: ({ store, inbox }) => createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
      [SENTINEL_MEMBER]: SENTINEL_VALUE,
    }),
    needles: [SENTINEL_MEMBER, SENTINEL_VALUE],
  },
  {
    label: 'an undeclared member of a patch body',
    run: ({ store, digest }) => patchSubscription(store, digest.id, {
      [SENTINEL_MEMBER]: SENTINEL_VALUE,
    }),
    needles: [SENTINEL_MEMBER, SENTINEL_VALUE],
  },
  {
    label: 'a patch against an id that is not there',
    run: ({ store }) => patchSubscription(store, MISSING_ID, {
      connectorId: MISSING_CONNECTOR_ID,
    }),
    needles: [SENTINEL_ID],
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
          message: `No connector carries ${SENTINEL_ID}: ${SENTINEL_VALUE}`,
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
      const planted = await plantSubscriptions();
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
    // The translation below passes the `StoreRefusal` as `cause`,
    // which is where a debugger and the error-level log line find
    // it. `cause` is non-enumerable per spec, so it reaches no
    // serialised body — a property of the platform rather than of
    // this module, which is why it is measured here rather than
    // assumed.
    const { store, digest, vault } = await plantSubscriptions();
    const refusal = await refusalFrom(() => createSubscription(store, RADAR, {
      format: digest.format,
      connectorId: vault.id,
      intervalSeconds: DAILY,
    }));

    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'message']);
  });
});
