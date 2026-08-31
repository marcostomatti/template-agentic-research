/**
 * `operatorSettingsSchema` — the whole of what an operator is
 * allowed to configure about this deployment, and the only thing
 * standing between a request body and a `jsonb` column that
 * constrains nothing.
 *
 * Five claims, each one a promise the column cannot make for itself.
 * That an empty payload is a COMPLETE value, since that is what a
 * read before any write is answered with and what makes omitting a
 * member the only way a member is cleared. That a mistyped member is
 * refused rather than stripped, because a stripped one is a
 * preference its author expressed and nothing reads. That the one
 * open record is open in its KEYS and closed in its VALUES — a
 * channel this service never declared is fine, a preference that is
 * not a boolean is not. That a refusal names a path a route can act
 * on, which is what `openPaths` in `src/http/validation.ts` is
 * declared against. And that the schema's key set and the interface's
 * member set are the same set, so a fourth setting added to one and
 * not the other cannot ship.
 *
 * The last of those is the only claim here that no request can
 * exercise, and it is split across the two gates on purpose. A key
 * added to the schema alone reddens the runtime set equality below;
 * a member added to the interface alone reddens `check-types` at
 * {@link SCHEMA_NAMES_EVERY_INTERFACE_MEMBER}, whose annotation is
 * unsatisfiable the moment `Exclude` stops being `never`. A package
 * `test` script does not type-check, so the second half is a green
 * suite until `bun run check-types` runs — which is why the two are
 * written as one case rather than left to be noticed separately.
 *
 * The table carries both outcomes and a guard asserts it. A block of
 * nothing but refusals is fully green against a schema that refuses
 * everything, and a block of nothing but accepts against one that
 * accepts everything; the accepted rows and the refused rows are each
 * other's control. The open record gets a stronger guard than that,
 * because its two failure modes are opposite: it needs an accepted
 * row carrying a key this service never declared AND a refused row
 * naming a path INSIDE it, or the table proves openness without value
 * checking or value checking without openness.
 *
 * TWO MEASURED FACTS ABOUT THE ZOD IN THIS TREE SIT IN THE TABLE
 * rather than in a comment alone, so a version that changes either is
 * a red case here rather than a route whose answers quietly moved. An
 * enum refuses a value that is not a string with the SAME
 * `invalid_value` code it refuses an unknown format with, so those
 * two rows differ in their subject and not in the detail a caller
 * reads. And an own `__proto__` inside the open record is dropped
 * before its value is ever checked, so it is ACCEPTED rather than
 * refused.
 *
 *
 * Mutation grid, measured over the 31 cases in this file with
 * `--reporter=json` and read as failed `fullName`s rather than as a
 * count. Eleven legs on the module, in two classes, because the two
 * halves of the table are reddened by opposite mutations and a grid
 * made of one class leaves the other half green while looking
 * thorough.
 *
 * The five WIDENING legs are aimed at the refusal side. Dropping
 * `.strict()` reddens the undeclared top-level member and nothing
 * else; replacing `slugParamSchema` with a bare string reddens the
 * one row that pattern is load-bearing at; letting the record's
 * values be unknown reddens the non-boolean preference. Replacing
 * the format enum with a string reddens TWO — the unknown format
 * AND the non-string one, which is what says those rows are the same
 * check read from two sides rather than two rows of one. Abandoning
 * the record schema altogether reddens FOUR, and the two beyond its
 * own refusals are the ones worth reading: an unchecked member is
 * handed through by reference, so both cases under `the parsed
 * payload` fail, and they are the only cases here that would report
 * a schema which had stopped copying.
 *
 * The six NARROWING legs are aimed at the accepted side. Closing the
 * record's keys to two declared channels reddens the openness row
 * and the `__proto__` row, which sits inside that same record.
 * Restricting the format enum to one member reddens SIX — four of
 * the five loop cases, the fully configured payload and the
 * omit-each case — which is the evidence the loop reads the tuple
 * rather than restating a list of its own. Adding a fourth key to
 * the schema reddens exactly ONE, the key-set equality, and that is
 * the whole of the evidence that the drift case pins the schema
 * rather than agreeing with whatever it holds.
 *
 * Two of those six are worth reading rather than counting. Making
 * `digestFormat` REQUIRED reddens 14 of 31, most of them refusal
 * rows: a refused row asserts the whole issue list, so a second
 * issue arriving beside the one it named fails it. That is the table
 * working as intended and not over-coverage — a refusal for one
 * reason and a refusal for two are different answers, and a caller
 * reading details cannot be told they are the same. And making the
 * root nullable reddens 2, of which only the first is its subject:
 * wrapping the object removes the `.shape` the drift case reads, so
 * the second red is incidental to the leg rather than a claim it
 * pinned.
 *
 * What no module mutation in the grid reaches. The five table guards
 * and the format guard read only the tables beside them and are
 * aimed at a later edit — an outcome side deleted whole, the open
 * record left with a row on only one of its two sides, a refusal
 * class dropped, the tuple narrowed until the loop proves nothing.
 * One refusal row is left over honestly: that a list is not a
 * payload has no leg here, because an object schema refusing an
 * array is zod's own and the narrow leg beside it reaches only the
 * null half of the same claim.
 *
 * The two type-level pins are invisible to the SUITE entirely, both
 * measured. A fourth member on `OperatorSettings` alone leaves all
 * 31 cases green and answers TS2322 at the
 * {@link SCHEMA_NAMES_EVERY_INTERFACE_MEMBER} line; a name added to
 * {@link DECLARED_MEMBERS} that the interface does not carry answers
 * TS2322 at the `satisfies`.
 * Refusals are read as `code` and dotted field path and never as
 * zod's own `message`. The message is the member that quotes
 * submitted content, and pinning its wording would make a zod minor a
 * red suite here for no behaviour change.
 */
import type { OperatorSettings } from '../db/schema/settings.js';
import type { ZodSafeParseResult } from 'zod';

import { describe, expect, it } from 'vitest';

import { EXPORT_FORMATS } from '../db/schema/values.js';

import { operatorSettingsSchema } from './payload.js';

/** The two outcomes the table below has to carry rows for. */
const OUTCOMES = ['accepted', 'refused'];

/**
 * The members the schema declares, written out rather than read off
 * it, so this file pins the key set instead of agreeing with the
 * module about whatever it happens to hold.
 *
 * `satisfies` closes one direction at compile time: a name here that
 * `OperatorSettings` does not carry fails to build, so the list
 * cannot drift ahead of the interface.
 * {@link SCHEMA_NAMES_EVERY_INTERFACE_MEMBER} closes the other.
 */
const DECLARED_MEMBERS = [
  'defaultDomainSlug',
  'digestFormat',
  'notificationChannels',
] as const satisfies readonly (keyof OperatorSettings)[];

/**
 * Whatever `OperatorSettings` carries that {@link DECLARED_MEMBERS}
 * does not. `never` while the two agree.
 */
type UnlistedInterfaceMembers =
  Exclude<keyof OperatorSettings, (typeof DECLARED_MEMBERS)[number]>;

/**
 * That {@link DECLARED_MEMBERS} names every member of the interface.
 *
 * The annotation is what does the work: with nothing left over the
 * conditional is `true` and the initializer type-checks, and the
 * moment a fourth member is added to `OperatorSettings` alone it
 * becomes `false` and the assignment is a `check-types` error at this
 * line. Wrapped in tuples so a union member does not distribute the
 * conditional and answer `boolean`, which would accept the
 * initializer and pin nothing at all.
 */
type InterfaceFullyListed =
  [UnlistedInterfaceMembers] extends [never] ? true : false;

const SCHEMA_NAMES_EVERY_INTERFACE_MEMBER: InterfaceFullyListed = true;

/**
 * The one member whose keys the operator owns, as a route spells it
 * in `openPaths` — unprefixed, because this payload IS the body it
 * arrives in rather than one member of a larger one.
 */
const OPEN_RECORD = 'notificationChannels';

/**
 * A channel name no convention in this repo would produce, standing
 * in for the vocabulary a registered channel module brings. Used as a
 * key of the open record and read back by the guard that proves the
 * record is open, so the table and the guard cannot disagree about
 * which row carried it.
 */
const OPERATOR_KEY = 'operator chose this';

/**
 * A deployment that has configured all three settings, in the
 * register the seed writes: `example-tech-radar` is the worked
 * example `data/domains.json` carries, and the two channel names are
 * the kinds `src/notifications/` registers modules under.
 *
 * One declaration, used as the payload submitted AND as the payload
 * expected back, because those are the same claim — nothing here is
 * defaulted, coerced or renamed on the way through. Written twice
 * they would be two literals free to drift into agreeing about a
 * member neither one exercises.
 */
const FULL_PAYLOAD: OperatorSettings = {
  defaultDomainSlug: 'example-tech-radar',
  digestFormat: 'obsidian_md',
  notificationChannels: { email: true, webhook: false },
};

/**
 * One payload a route might be handed, and what the schema does with
 * it. A refused row carries the issue `code` and the dotted field
 * path it is refused AT, so the table says why each payload is out
 * and where a caller should look.
 */
type PayloadCase =
  | {
    readonly label: string;
    readonly outcome: 'accepted';
    readonly input: unknown;
    readonly parsed: OperatorSettings;
  }
  | {
    readonly label: string;
    readonly outcome: 'refused';
    readonly input: unknown;
    readonly code: string;
    readonly field: string;
  };

/**
 * The payloads the schema has to separate.
 *
 * The accepted side is written with its whole parsed value rather
 * than with the members a case happens to care about, which is what
 * makes a stripped member and an invented one both visible: nothing
 * else in this file would notice a schema that quietly dropped
 * `digestFormat` on the way through.
 *
 * The {@link OPERATOR_KEY} row is the openness control. Its key is a
 * name this service has never heard of and never will, and it is
 * ACCEPTED — which is the setting working rather than a gap in the
 * table, and is why the refusals beneath it have to reach INTO the
 * same record to mean anything.
 */
const PAYLOAD_CASES: readonly PayloadCase[] = [
  {
    label: 'an empty payload', outcome: 'accepted',
    input: {}, parsed: {},
  },
  {
    label: 'a fully configured deployment', outcome: 'accepted',
    input: FULL_PAYLOAD, parsed: FULL_PAYLOAD,
  },
  {
    label: 'a default domain alone', outcome: 'accepted',
    input: { defaultDomainSlug: 'example-tech-radar' },
    parsed: { defaultDomainSlug: 'example-tech-radar' },
  },
  {
    label: 'a one-character slug', outcome: 'accepted',
    input: { defaultDomainSlug: 'r' }, parsed: { defaultDomainSlug: 'r' },
  },
  {
    label: 'a channel this service never declared', outcome: 'accepted',
    input: { notificationChannels: { [OPERATOR_KEY]: true } },
    parsed: { notificationChannels: { [OPERATOR_KEY]: true } },
  },
  {
    label: 'a channel switched off by name', outcome: 'accepted',
    input: { notificationChannels: { email: false } },
    parsed: { notificationChannels: { email: false } },
  },
  {
    label: 'a configured-to-nothing payload', outcome: 'accepted',
    input: { notificationChannels: {} },
    parsed: { notificationChannels: {} },
  },
  {
    label: 'an undeclared top-level member', outcome: 'refused',
    input: { digestFormatt: 'rss' },
    code: 'unrecognized_keys', field: '',
  },
  {
    label: 'a payload that is not an object at all', outcome: 'refused',
    input: null, code: 'invalid_type', field: '',
  },
  {
    label: 'a payload that is a list', outcome: 'refused',
    input: [], code: 'invalid_type', field: '',
  },
  {
    label: 'a digest format outside the tuple', outcome: 'refused',
    input: { digestFormat: 'csv' },
    code: 'invalid_value', field: 'digestFormat',
  },
  {
    // Measured rather than predicted: the enum answers
    // `invalid_value` for a number as well as for an unknown format,
    // so this row's subject is the VALUE the schema refuses and not
    // the detail it refuses with. Its neighbour above carries the
    // same code, which is the fact worth having pinned.
    label: 'a digest format that is not a string', outcome: 'refused',
    input: { digestFormat: 5 },
    code: 'invalid_value', field: 'digestFormat',
  },
  {
    label: 'a default domain the slug pattern refuses', outcome: 'refused',
    input: { defaultDomainSlug: 'Example Radar' },
    code: 'invalid_format', field: 'defaultDomainSlug',
  },
  {
    label: 'a default domain that is not a string', outcome: 'refused',
    input: { defaultDomainSlug: 7 },
    code: 'invalid_type', field: 'defaultDomainSlug',
  },
  {
    label: 'a channel preference that is not a boolean', outcome: 'refused',
    input: { notificationChannels: { email: 'yes' } },
    code: 'invalid_type', field: 'notificationChannels.email',
  },
  {
    label: 'a channels record that is a list', outcome: 'refused',
    input: { notificationChannels: [] },
    code: 'invalid_type', field: 'notificationChannels',
  },
];

/** One row of {@link PAYLOAD_CASES} that the schema has to refuse. */
type RefusedCase = Extract<PayloadCase, { outcome: 'refused' }>;

/**
 * Whether a row is one of the refused ones.
 *
 * A type predicate rather than a bare comparison, because `filter`
 * answers the union it was given: every guard below would otherwise
 * have to re-narrow, and the one that projects `field` would not
 * compile at all.
 */
function isRefused(row: PayloadCase): row is RefusedCase {
  return row.outcome === 'refused';
}

/**
 * The refused rows alone, narrowed once so the guards below can read
 * the `code` and the `field` a refusal carries.
 */
const REFUSED_CASES: readonly RefusedCase[] = PAYLOAD_CASES.filter(isRefused);

/**
 * What a refused parse reported, as `code` and dotted field path
 * pairs — the two facts a `ValidationError` detail is built from,
 * and the only two this file reads off an issue.
 *
 * A parse that SUCCEEDED answers an empty list rather than throwing,
 * so a case expecting a refusal fails on the empty list, naming the
 * refusal it wanted, instead of on a narrowing error that names
 * nothing.
 */
function refusalOf<T>(
  result: ZodSafeParseResult<T>,
): { code: string; field: string }[] {
  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => ({
    code: issue.code,
    field: issue.path.map((segment) => String(segment)).join('.'),
  }));
}

/** The outcomes a table carries, deduplicated and sorted. */
function outcomesOf(rows: readonly { readonly outcome: string }[]): string[] {
  return [...new Set(rows.map((row) => row.outcome))].sort();
}

/** The keys one accepted payload put in the open record. */
function openKeysOf(payload: OperatorSettings): string[] {
  return Object.keys(payload.notificationChannels ?? {});
}

// ---------------------------------------------------------------------------
// operatorSettingsSchema
// ---------------------------------------------------------------------------

describe('operatorSettingsSchema', () => {
  it('carries rows for both outcomes', () => {
    expect(outcomesOf(PAYLOAD_CASES)).toEqual(OUTCOMES);
  });

  it('labels every row distinctly', () => {
    const labels = PAYLOAD_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('names a distinct reason for each class of refusal', () => {
    const codes = [...new Set(REFUSED_CASES.map((row) => row.code))].sort();

    expect(codes).toEqual([
      'invalid_format', 'invalid_type', 'invalid_value', 'unrecognized_keys',
    ]);
  });

  it('brackets the open record from both sides', () => {
    // An accepted row whose key this service never declared proves
    // the record is open; a refused row naming a path INSIDE it
    // proves the values are still checked. Either side alone is
    // green against a schema that got exactly one of the two right.
    const open = PAYLOAD_CASES.some(
      (row) => row.outcome === 'accepted'
        && openKeysOf(row.parsed).includes(OPERATOR_KEY),
    );
    const checked = REFUSED_CASES.some(
      (row) => row.field.startsWith(`${OPEN_RECORD}.`),
    );

    expect({ open, checked }).toEqual({ open: true, checked: true });
  });

  it('refuses the open record as a whole as well as inside it', () => {
    // The distinction `src/http/validation.ts` masks against: a
    // fault against the record ITSELF keeps its declared name, and
    // only a fault below it is the operator's key. A table with no
    // row of the first kind cannot tell the two apart.
    const whole = REFUSED_CASES.map((row) => row.field)
      .filter((field) => field === OPEN_RECORD);

    expect(whole).toEqual([OPEN_RECORD]);
  });

  for (const row of PAYLOAD_CASES) {
    if (row.outcome === 'accepted') {
      it(`accepts ${row.label}`, () => {
        expect(operatorSettingsSchema.parse(row.input))
          .toStrictEqual(row.parsed);
      });

      continue;
    }

    it(`refuses ${row.label}`, () => {
      const result = operatorSettingsSchema.safeParse(row.input);

      expect(refusalOf(result)).toEqual([
        { code: row.code, field: row.field },
      ]);
    });
  }
});

// ---------------------------------------------------------------------------
// The digest format
// ---------------------------------------------------------------------------

describe('the digest format', () => {
  it('exercises every format the tuple declares', () => {
    // The loop below is only a claim about the schema while the
    // tuple it reads has more than one member and repeats none of
    // them. Against a one-member tuple it would be green about a
    // schema that had stopped being an enum at all.
    expect(EXPORT_FORMATS.length).toBeGreaterThan(1);
    expect(EXPORT_FORMATS.length).toBe(new Set(EXPORT_FORMATS).size);
  });

  for (const format of EXPORT_FORMATS) {
    it(`accepts a digest rendered as ${format}`, () => {
      // Driven off `EXPORT_FORMATS` itself rather than off a list
      // written out here, because that tuple is the claim: the
      // formats an operator may prefer are the formats
      // `export_subscriptions.format` is CHECKed against, and a
      // schema restating a subset of them would pass every other
      // case in this file.
      const parsed = operatorSettingsSchema.parse({ digestFormat: format });

      expect(parsed).toStrictEqual({ digestFormat: format });
    });
  }
});

// ---------------------------------------------------------------------------
// Drift against OperatorSettings
// ---------------------------------------------------------------------------

describe('drift against the interface', () => {
  it('declares one key per interface member and no others', () => {
    // Two halves of one claim, reddening under different commands.
    // A key added to the schema alone fails the set equality below;
    // a member added to the interface alone makes the annotation on
    // that constant unsatisfiable, which only `check-types` reports.
    expect(SCHEMA_NAMES_EVERY_INTERFACE_MEMBER).toBe(true);
    expect(Object.keys(operatorSettingsSchema.shape).sort())
      .toEqual([...DECLARED_MEMBERS].sort());
  });

  it('lets any single member be omitted from a full payload', () => {
    // Every member optional is what makes an absent one mean the
    // deployment's own default applies, and it is what the column's
    // `{}` default rests on. Driven off the full payload's own keys
    // rather than named here, so a fourth member inherits the claim.
    const members = Object.keys(FULL_PAYLOAD);
    const withoutEach = members.map((omitted) => ({
      omitted,
      accepted: operatorSettingsSchema.safeParse(Object.fromEntries(
        Object.entries(FULL_PAYLOAD).filter(([key]) => key !== omitted),
      )).success,
    }));

    expect([...members].sort()).toEqual([...DECLARED_MEMBERS].sort());
    expect(withoutEach).toEqual(
      members.map((omitted) => ({ omitted, accepted: true })),
    );
  });
});

// ---------------------------------------------------------------------------
// What the schema hands back
// ---------------------------------------------------------------------------

describe('the parsed payload', () => {
  it('is a new object rather than the body it was handed', () => {
    // The service hands this straight to a store. Were it the same
    // object, a stored payload would alias `req.body`, and a later
    // mutation of either would be seen by both.
    const body = { notificationChannels: { email: true } };
    const parsed = operatorSettingsSchema.parse(body);

    expect(parsed).toStrictEqual(body);
    expect(parsed).not.toBe(body);
    expect(parsed.notificationChannels).not.toBe(body.notificationChannels);
  });

  it('drops an own __proto__ inside the open record', () => {
    // Measured under the zod in this tree rather than chosen: the
    // key is removed before its value is ever checked, so a
    // `__proto__` whose value is not a boolean is ACCEPTED and
    // stored as absent rather than refused. Built through
    // `JSON.parse` because that is how body-parser produces one —
    // in an object literal `__proto__` sets the prototype instead of
    // becoming an own key, and the case would then measure the
    // literal rather than the schema.
    const onTheWire: unknown = JSON.parse(
      '{"notificationChannels":{"__proto__":"yes","email":true}}',
    );
    const parsed = operatorSettingsSchema.parse(onTheWire);

    expect(parsed).toStrictEqual({ notificationChannels: { email: true } });
    expect(Object.getPrototypeOf(parsed.notificationChannels))
      .toBe(Object.prototype);
  });
});
