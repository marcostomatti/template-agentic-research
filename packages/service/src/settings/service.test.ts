/**
 * `src/settings/service.ts` — what the two operator settings
 * operations refuse, and where a refused request stopped. Driven
 * over `tests/helpers/memory-research-store.ts`, so every claim
 * here is answered with no database anywhere.
 *
 * Four claims, all of them about saying no. The positive half
 * — the empty read before any write, a first write, a
 * rewrite replacing the payload as a unit, and a write clearing a
 * member by omitting it — is this file's successor's, and
 * the measured zero named at the end of the grid below is the
 * hand-off to it.
 *
 * THAT A BODY IS PARSED HERE, NOT ABOVE. Every row of the refusal
 * table is submitted to a SERVICE function rather than to a
 * schema, which is what says an MCP tool in wave 3 cannot be
 * handed a payload the HTTP route would have refused.
 * `./payload.test.ts` asserts what the schema does with these
 * same shapes; what this file asserts is that {@link putSettings}
 * ASKS. Each row carries its own positive control in a case of
 * its own, varied along the one axis under test, because a
 * service refusing everything passes every assertion a refusal
 * case makes on its own.
 *
 * THAT THE TWO REFUSALS AT ONE FIELD ARE TOLD APART. A
 * `defaultDomainSlug` the pattern refuses and a `defaultDomainSlug`
 * that names no domain are both 422 at that same member, and only
 * the detail's `code` separates them — one is a spelling to
 * fix and the other is a domain to create. The distinctness case
 * pins that without pinning either code's spelling, so a
 * vocabulary free to be reworded stays free while the difference
 * does not.
 *
 * THAT WHERE A REQUEST STOPPED IS A CLAIM OF ITS OWN. A refusal
 * has two halves — what was answered, and how far the call
 * got — and no assertion over the answer can see the second.
 * The reach table wraps the store in a recording proxy and pins
 * the method names each request reached, in order: a schema fault
 * touches the store not at all, an unknown slug reaches the
 * lookup and stops there, a body naming no default skips the
 * lookup entirely rather than issuing one and discarding it, and
 * an accepted body reaches both. Nothing else in this file can
 * tell a guard that ran before the write from one that ran after
 * it, because the in-memory dataset looks identical either way.
 *
 * THAT NOTHING SUBMITTED COMES BACK. The containment block counts
 * occurrences of a sentinel in the serialised refusal rather than
 * asserting absence, and takes the same count over an envelope
 * planted here — a search that would find nothing anywhere
 * reports a clean refusal and a leaking one alike. Its four rows
 * are the four channels a settings body has: a member's VALUE, an
 * undeclared top-level KEY, a key inside the one open record, and
 * an enum member the tuple does not carry.
 *
 * Two of those four rows have a live leg in the grid below and
 * two do not, which the report owes rather than hides. The slug
 * row is reddened by interpolating the submitted slug into this
 * module's own message, because that message is the one this
 * module builds. The open-record row is reddened by dropping
 * {@link SETTINGS_OPEN_PATHS}, since the key travels in
 * `issue.path` and the mask is what removes it. The other two are
 * closed UPSTREAM: zod puts an undeclared key in `issue.keys`
 * rather than in the path, and a refused enum member in neither,
 * so no mutation of THIS module can make either come back. The
 * one leg that reddens them removes the refusal entirely, which
 * says the rows RUN and nothing about what they would catch, so
 * their zero rests on the planted control alone.
 *
 * Mutation grid, measured over the 36 cases here with
 * `--reporter=json` and read as the failed `fullName` SET rather
 * than as a count. Nine legs, and every figure is a measurement
 * over this case count that moves again when the positive half
 * lands.
 *
 * THE WIDEST LEG IS THE CONTROL THAT THE FILE REACHES THE PARSE
 * AT ALL. Handing the body over unparsed reddens 13: every schema
 * row of the refusal table, three of the four containment rows,
 * and both cases about where a schema fault stops. It is the leg
 * that says these rows are submitted to a SERVICE rather than
 * asserted against a schema somewhere else.
 *
 * THE TWO SLUG-CHECK LEGS OVERLAP RATHER THAN COINCIDE, and that
 * is the reach table earning its place. Dropping the check
 * reddens 7 and moving it below the write reddens 4, sharing 3;
 * the four the first keeps are the ones where no refusal is built
 * at all, and the one the second keeps is the reach row for a
 * slug that IS there, whose recorded order flips. A file without
 * the recorded call order would have measured one identical set
 * for two different faults, which is what the sibling groups
 * record for their own guarded writes.
 *
 * THE ACCEPTED CONTROLS CARRY THE FILE, and one leg is the whole
 * of the evidence. Looking a slug up even when none was supplied
 * reddens 8, of which SIX are accepted controls and none is a
 * refusal case: every refusal row is refused under that leg too,
 * for its own reason, so the rows named for saying no are blind
 * to a module that says no to everything.
 *
 * FOUR NARROW LEGS REDDEN EXACTLY ONE APIECE and each lands on
 * the case named for it: dropping the detail's `code`,
 * interpolating the submitted slug into the message, defaulting
 * the empty read to a payload, and stamping a member onto what is
 * written. Declaring no open path reddens 2, the masked field row
 * and the containment row beneath it.
 *
 * ONE OF THOSE FOUR NAMES A LIMIT OF THIS FILE rather than a
 * strength. Dropping the `code` reddens the refusal row and NOT
 * the distinctness case, because a detail carrying no code still
 * differs from `invalid_format` and the set is still of size two.
 * So the distinctness case pins that the two answers differ and
 * never that either code is meaningful; the row above it is what
 * pins the spelling, and neither stands in for the other.
 *
 * NINE CASES NO LEG REACHES, and they divide into three kinds.
 * Six are table guards reading only the table beside them, aimed
 * at a later edit rather than at this module: an outcome side
 * deleted whole, a declared member left unexercised, a reach
 * table that stopped spanning the range. One is the planted
 * containment control, invisible by construction and deliberately
 * so — it proves the SEARCH, where the leak legs prove the
 * SUBJECT. The last two are the accepted controls whose axis is a
 * well-formed slug that resolves: no leg here makes such a slug
 * refused, so their green says nothing, and they are the rows a
 * later widening leg would be aimed at.
 *
 * WHAT HAS NO LEG HERE AT ALL is the whole-unit write, and it is
 * not this module's rule to break. {@link putSettings} hands the
 * parsed payload over unaltered — which the stamping leg
 * does pin — and the REPLACEMENT of the stored payload is
 * `SettingsStore.writeSettings`'s own, asserted in
 * `tests/helpers/memory-research-store.test.ts` and owed again by
 * `src/settings/db-store.ts`. A merge leg written here would have
 * had to add a read, and would have reddened the reach rows for a
 * reason about nothing.
 */
import type { SettingsServiceStore } from './service.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { describe, expect, it } from 'vitest';

import { AppError, ValidationError } from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { getSettings, putSettings } from './service.js';

/** The seeded worked example, and the one domain every case plants. */
const RADAR = 'example-tech-radar';

/**
 * A slug shaped like one and carried by no row in any case here.
 *
 * Shaped like one on purpose: a string `slugParamSchema` refuses
 * never reaches the store, so a sentinel of the wrong shape would
 * measure the parser where these rows are about the lookup.
 */
const MISSING_SLUG = 'example-not-a-domain';

/**
 * A channel name no convention in this repo would produce,
 * standing in for the vocabulary a registered channel module
 * brings. Used as a key of the open record, whose keys this
 * service never declares.
 */
const OPERATOR_KEY = 'operator chose this';

/**
 * A store holding {@link RADAR} and nothing else.
 *
 * The domain is planted through the store rather than through a
 * service, because no function in THIS module writes one: the
 * fixture reaches for the nearest writer that exists, and
 * `src/domains/service.ts` has its own file for its own claims.
 *
 * @returns The store, with one domain and no settings row.
 */
async function storeWithRadar(): Promise<MemoryResearchStore> {
  const store = createMemoryResearchStore();

  await store.insertDomain({ slug: RADAR, name: 'Radar', settings: {} });

  return store;
}

/**
 * Runs a call that has to be refused, and hands the refusal back.
 *
 * NARROWED TO ONE CLASS, WHICH IS A CLAIM RATHER THAN A
 * CONVENIENCE. This module refuses in exactly one way: the
 * schema refuses a body and the lookup refuses a slug, and both
 * are 422. Its three sibling services each answer two or three
 * classes and their helpers hand an `AppError` back for that
 * reason; here anything else arriving — a 404 for the slug, a
 * 409 out of nowhere — is rethrown and fails the case that
 * asked. It also removes the cast those files pay to read
 * `details`, since `ValidationError` declares the member
 * `AppError` types as `unknown`.
 *
 * @param run - The call.
 * @returns The `ValidationError` it raised.
 * @throws When the call ANSWERED, so an operation whose refusal
 *   quietly stopped happening fails here — naming the
 *   refusal it wanted — rather than asserting over an error
 *   nobody built. Anything that is not a `ValidationError` is
 *   rethrown unchanged: a `StoreRefusal` reaching a caller would
 *   be a bug in this module rather than one of its answers, and
 *   folding it in would report a 500 as a rule working.
 */
async function refusalFrom(
  run: () => Promise<unknown>,
): Promise<ValidationError> {
  try {
    await run();
  } catch (err) {
    if (err instanceof ValidationError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refusal, and the call answered');
}

/**
 * The two facts a caller reads off each detail of a 422.
 *
 * `message` is not among them. Every detail here was built either
 * by `src/http/validation.ts`, whose wording is asserted in that
 * module's own file, or by this module, whose one sentence is a
 * constant free to be reworded. What a field path and a code say
 * is what the SERVICE asked for.
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
 * @returns How many times the needle occurs. A count rather than
 *   a boolean, so a zero can be read against a known positive
 *   taken by this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Wraps a store so that every method reached through it is
 * recorded.
 *
 * Where a refusal STOPPED is the half no assertion over the
 * answer can see, and on this surface it is the whole of two
 * claims: that a slug naming nothing is refused BEFORE the write,
 * and that a body naming no default reaches the domain lookup not
 * at all. The stored payload is identical under a guard that ran
 * first and one that ran after a write it then rolled back in the
 * only way an in-memory map can — which is to say, not at
 * all, but invisibly.
 *
 * @param store - The store to wrap.
 * @param calls - The array every reached method name is pushed
 *   onto, in call order.
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
// The bodies this module refuses
// ---------------------------------------------------------------------------

/** Where a refusal in the table below was decided. */
const SOURCES = ['schema', 'service'];

/**
 * Every field a refusal here can name.
 *
 * Three declared members and the root, which is what a
 * root-level issue is given in place of the empty string a caller
 * could not act on. `notificationChannels` appears MASKED, since
 * every fault reachable inside it is a fault at a key the
 * operator chose.
 */
const REFUSABLE_FIELDS = [
  'body',
  'defaultDomainSlug',
  'digestFormat',
  'notificationChannels.*',
];

/** One body this module refuses, beside one it accepts. */
interface RefusalCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /**
   * Which layer refused it. `schema` is `./payload.ts` reached
   * through `parseBody`; `service` is this module's own rule,
   * which needs a store to answer and so cannot live there.
   */
  readonly source: 'schema' | 'service';

  /** The body that has to be refused. */
  readonly body: unknown;

  /** Every detail the refusal has to carry, in order. */
  readonly details: readonly { field: string; code: string }[];

  /**
   * A body differing along the ONE axis under test, which has to
   * be accepted. A service refusing every payload passes the
   * refusal case above and fails this one.
   */
  readonly control: unknown;
}

/**
 * Every way a settings body can be turned away.
 *
 * The two rows at `defaultDomainSlug` are the pair this file
 * exists for: one is refused by the pattern and one by the
 * lookup, they answer the same status at the same field, and the
 * `code` is the whole of the difference. Neither stands in for
 * the other — a module that had lost the lookup passes the
 * first, and one whose schema had stopped narrowing the member
 * passes the second.
 *
 * The two `digestFormat` rows carry a measurement rather than a
 * prediction: zod answers `invalid_value` for a value that is not
 * a string as readily as for an unknown format, so those two
 * differ in their subject and not in the detail a caller reads. A
 * reader predicting `invalid_type` for the second writes a red
 * row.
 */
const REFUSAL_CASES: readonly RefusalCase[] = [
  {
    label: 'a default domain that names nothing',
    source: 'service',
    body: { defaultDomainSlug: MISSING_SLUG },
    details: [{ field: 'defaultDomainSlug', code: 'unknown_domain' }],
    control: { defaultDomainSlug: RADAR },
  },
  {
    label: 'a default domain the pattern refuses',
    source: 'schema',
    body: { defaultDomainSlug: 'Not A Slug' },
    details: [{ field: 'defaultDomainSlug', code: 'invalid_format' }],
    control: { defaultDomainSlug: RADAR },
  },
  {
    label: 'an undeclared top-level member',
    source: 'schema',
    body: { digestFormatt: 'rss' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
    control: { digestFormat: 'rss' },
  },
  {
    label: 'a digest format outside the tuple',
    source: 'schema',
    body: { digestFormat: 'csv' },
    details: [{ field: 'digestFormat', code: 'invalid_value' }],
    control: { digestFormat: 'rss' },
  },
  {
    label: 'a digest format that is not a string',
    source: 'schema',
    body: { digestFormat: 5 },
    details: [{ field: 'digestFormat', code: 'invalid_value' }],
    control: { digestFormat: 'rss' },
  },
  {
    label: 'a channel preference that is not a boolean',
    source: 'schema',
    body: { notificationChannels: { [OPERATOR_KEY]: 'yes' } },
    details: [{ field: 'notificationChannels.*', code: 'invalid_type' }],
    control: { notificationChannels: { [OPERATOR_KEY]: true } },
  },
  {
    label: 'a body that is not an object at all',
    source: 'schema',
    body: null,
    details: [{ field: 'body', code: 'invalid_type' }],
    control: {},
  },
  {
    label: 'a body that is a list',
    source: 'schema',
    body: [],
    details: [{ field: 'body', code: 'invalid_type' }],
    control: {},
  },
];

describe('the bodies this module refuses', () => {
  it('carries rows decided at both layers', () => {
    // A table of nothing but schema rows would be fully green
    // against a service that had lost its own rule, and one of
    // nothing but service rows against a service that had
    // stopped parsing at all.
    expect([...new Set(REFUSAL_CASES.map((row) => row.source))].sort())
      .toEqual([...SOURCES].sort());
  });

  it('names every field a refusal here can name', () => {
    // Paired by name rather than counted, so a declared member
    // left unexercised is this case failing rather than a table
    // that quietly covers three of four.
    const named = REFUSAL_CASES.flatMap((row) => row.details)
      .map((detail) => detail.field);

    expect([...new Set(named)].sort()).toEqual([...REFUSABLE_FIELDS].sort());
  });

  it('expects a detail from every row', () => {
    // A row expecting an empty detail list would pass against a
    // refusal that named nothing at all, which is the one answer
    // a caller cannot act on.
    expect(REFUSAL_CASES.filter((row) => row.details.length === 0))
      .toEqual([]);
  });

  for (const row of REFUSAL_CASES) {
    it(`refuses ${row.label}`, async () => {
      const store = await storeWithRadar();
      const refusal = await refusalFrom(() => putSettings(store, row.body));

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);

      // The whole list rather than its first member: a refusal
      // for one reason and a refusal for two are different
      // answers to a caller reading details.
      expect(detailsOf(refusal.details)).toEqual([...row.details]);
    });

    it(`accepts what ${row.label} varied from`, async () => {
      const store = await storeWithRadar();

      await expect(putSettings(store, row.control)).resolves.toBeDefined();
    });
  }

  it('tells the two default-domain refusals apart', async () => {
    // Not a pin on either code, which is free to be respelled: a
    // pin on the DISTINCTION. Both are 422 at the same member,
    // and a module answering one code to both would tell an
    // operator to fix a spelling that is already right.
    const store = await storeWithRadar();
    const shape = await refusalFrom(() => putSettings(store, {
      defaultDomainSlug: 'Not A Slug',
    }));
    const missing = await refusalFrom(() => putSettings(store, {
      defaultDomainSlug: MISSING_SLUG,
    }));
    const fields = [shape, missing].map((err) => detailsOf(err.details)
      .map((detail) => detail.field));
    const codes = [shape, missing].map((err) => detailsOf(err.details)
      .map((detail) => detail.code));

    expect(fields).toEqual([['defaultDomainSlug'], ['defaultDomainSlug']]);
    expect(new Set(codes.flat()).size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Where a refused request stopped
// ---------------------------------------------------------------------------

/**
 * Every store method {@link putSettings} can reach.
 *
 * `satisfies` closes one direction at compile time: a name here
 * that `SettingsServiceStore` does not carry fails to build, so
 * the list cannot drift ahead of the port. The other direction is
 * deliberately left open — `readSettings` is on that type and
 * is reached by {@link getSettings} alone, so a list covering the
 * type entire would be naming a method no request below can
 * produce.
 */
const REACHABLE_METHODS = [
  'findDomainBySlug',
  'writeSettings',
] as const satisfies readonly (keyof SettingsServiceStore)[];

/** One request, and how far into the store it got. */
interface ReachCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The body submitted. */
  readonly body: unknown;

  /** The store methods it reached, in call order. */
  readonly reached: readonly string[];
}

/**
 * How far each class of request gets before it is answered.
 *
 * FOUR ROWS SPANNING THE WHOLE RANGE, which is what makes the
 * table discriminating rather than a restatement of the refusals
 * above. One reaches the store not at all, one reaches the lookup
 * and stops, one skips the lookup and writes, and one does both
 * in that order — so a proxy recording nothing satisfies the
 * first row alone, and a module that had lost its ordering fails
 * a different row whichever way it went.
 */
const REACH_CASES: readonly ReachCase[] = [
  {
    label: 'a body the schema refuses',
    body: { digestFormat: 'csv' },
    reached: [],
  },
  {
    label: 'a default domain that names nothing',
    body: { defaultDomainSlug: MISSING_SLUG },
    reached: ['findDomainBySlug'],
  },
  {
    label: 'a body naming no default at all',
    body: { digestFormat: 'rss' },
    reached: ['writeSettings'],
  },
  {
    label: 'a default domain that is there',
    body: { defaultDomainSlug: RADAR },
    reached: ['findDomainBySlug', 'writeSettings'],
  },
];

describe('where a refused request stopped', () => {
  it('reaches every method this module can call', () => {
    const reached = REACH_CASES.flatMap((row) => [...row.reached]);

    expect([...new Set(reached)].sort())
      .toEqual([...REACHABLE_METHODS].sort());
  });

  it('spans a request that reaches nothing and one that reaches both', () => {
    const widths = REACH_CASES.map((row) => row.reached.length);

    expect(Math.min(...widths)).toBe(0);
    expect(Math.max(...widths)).toBe(REACHABLE_METHODS.length);
  });

  for (const row of REACH_CASES) {
    it(`stops where it should for ${row.label}`, async () => {
      const store = await storeWithRadar();
      const calls: string[] = [];

      // The domain planted above is reached through the bare
      // store, so `calls` holds only what the call under test
      // asked for.
      try {
        await putSettings(recordingStore(store, calls), row.body);
      } catch (err) {
        if (!(err instanceof AppError)) {
          throw err;
        }
      }

      expect(calls).toEqual([...row.reached]);
    });
  }

  it('creates no row when the first write is refused', async () => {
    // Two readings of one state, and the pair is what says the
    // collapse is this module's line rather than the store's.
    // `readSettings` answers null, so no row was written; and
    // `getSettings` answers `{}` over that same null, which is
    // the defaults applying. A refused write that had created an
    // empty row would pass the second alone.
    const store = await storeWithRadar();

    await refusalFrom(() => putSettings(store, {
      defaultDomainSlug: MISSING_SLUG,
    }));

    expect(await store.readSettings()).toBeNull();
    expect(await getSettings(store)).toEqual({});
  });

  it('leaves the stored payload standing when it refuses', async () => {
    // Read back through `getSettings`, not off the refusal. A
    // write that landed and was then reported as a failure looks
    // identical from the error alone.
    const store = await storeWithRadar();

    await putSettings(store, { digestFormat: 'rss' });
    await refusalFrom(() => putSettings(store, {
      defaultDomainSlug: MISSING_SLUG,
    }));

    expect(await getSettings(store)).toEqual({ digestFormat: 'rss' });
  });

  it('refuses the body before it resolves the slug', async () => {
    // A body carrying BOTH faults answers the schema's alone,
    // which is what says the parse runs first. Measured: the
    // lookup is never issued, so the unknown slug is not
    // reported beside it and a caller fixes one fault at a time.
    const store = await storeWithRadar();
    const calls: string[] = [];
    const refusal = await refusalFrom(() => putSettings(
      recordingStore(store, calls),
      { defaultDomainSlug: MISSING_SLUG, digestFormat: 'csv' },
    ));

    expect(detailsOf(refusal.details))
      .toEqual([{ field: 'digestFormat', code: 'invalid_value' }]);
    expect(calls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/**
 * A slug shaped like one, so it reaches the store rather than the
 * parser. A sentinel the pattern refused would measure
 * `slugParamSchema` where this row is about the lookup's own
 * message.
 */
const SENTINEL_SLUG = 'sentinel-slug-value';

/** A key no schema here declares, submitted as one. */
const SENTINEL_MEMBER = 'sentinelMemberValue';

/** A key of the open record, submitted as the operator's own. */
const SENTINEL_CHANNEL = 'sentinel channel value';

/** A digest format the tuple does not carry, submitted as one. */
const SENTINEL_FORMAT = 'sentinel_format_value';

/**
 * The four strings the rows below submit. None is a substring of
 * another, so a count against one cannot be satisfied by another.
 */
const SENTINELS = [
  SENTINEL_SLUG,
  SENTINEL_MEMBER,
  SENTINEL_CHANNEL,
  SENTINEL_FORMAT,
];

/** One refused request, and what it submitted that must not return. */
interface ContainmentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The body, carrying the needle below. */
  readonly body: unknown;

  /** The submitted string the answer must not carry. */
  readonly needle: string;
}

/**
 * Every channel a settings body has for submitted content.
 *
 * A member's VALUE, an undeclared top-level KEY, a key inside the
 * one open record, and an enum member the tuple does not carry.
 * The four are not equally covered by the mutation grid and this
 * file's header says which two rest on the planted control alone.
 */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a default domain that names nothing',
    body: { defaultDomainSlug: SENTINEL_SLUG },
    needle: SENTINEL_SLUG,
  },
  {
    label: 'an undeclared top-level member',
    body: { [SENTINEL_MEMBER]: 1 },
    needle: SENTINEL_MEMBER,
  },
  {
    label: 'a preference under a channel it named',
    body: { notificationChannels: { [SENTINEL_CHANNEL]: 'yes' } },
    needle: SENTINEL_CHANNEL,
  },
  {
    label: 'a digest format outside the tuple',
    body: { digestFormat: SENTINEL_FORMAT },
    needle: SENTINEL_FORMAT,
  },
];

describe('what a refusal is allowed to say', () => {
  it('submits every sentinel through a channel of its own', () => {
    expect(CONTAINMENT_CASES.map((row) => row.needle).sort())
      .toEqual([...SENTINELS].sort());
  });

  it('would find a sentinel a refusal did carry', () => {
    // The planted control. Every row below counts to zero, and a
    // zero is what a search over the wrong text answers too —
    // so the same helper is run against an envelope built here,
    // out of details this module did not produce, and has to find
    // each one.
    const planted = JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: `No domain carries ${SENTINEL_SLUG}`,
      details: [
        {
          field: `notificationChannels.${SENTINEL_CHANNEL}`,
          message: `${SENTINEL_FORMAT} is not a format`,
          code: SENTINEL_MEMBER,
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
      const store = await storeWithRadar();
      const refusal = await refusalFrom(() => putSettings(store, row.body));
      const answered = JSON.stringify(refusal.toJSON());

      // Counted rather than asserted absent, so the reading is a
      // number the planted control above has shown can be
      // something other than zero.
      expect(countOccurrences(answered, row.needle)).toBe(0);

      // The envelope was built at all: a helper answering an
      // empty string would satisfy the count above.
      expect(answered.length).toBeGreaterThan(0);
      expect(refusal.toJSON().code).toBe(refusal.code);
    });
  }

  it('puts nothing but the three declared members on the wire', async () => {
    // The key set rather than the fields read, which is what
    // catches a member arriving by spread. `cause` is
    // non-enumerable per spec and this module passes none anyway,
    // so a driver error could reach no serialised body even if
    // one existed to reach it.
    const store = await storeWithRadar();
    const refusal = await refusalFrom(() => putSettings(store, {
      defaultDomainSlug: MISSING_SLUG,
    }));

    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'details', 'message']);
  });
});
