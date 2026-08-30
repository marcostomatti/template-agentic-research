/**
 * `domainSettingsSchema` — the whole of what a domain is allowed to
 * configure about itself, and the only thing standing between a
 * request body and a `jsonb` column that constrains nothing.
 *
 * Five claims, each one a promise the column cannot make for itself.
 * That an empty payload is a COMPLETE value, since that is what makes
 * the column's `{}` default a default rather than a placeholder and
 * what makes the whole-unit patch rule expressible at all. That a
 * mistyped member is refused rather than stripped, because a stripped
 * one is a weight its author wrote and nothing reads. That the two
 * open records are open in their KEYS and closed in their VALUES —
 * a signal name nobody declared is fine, a weight that is not a
 * number is not. That a refusal names a path a route can act on,
 * which is what `openPaths` in `src/http/validation.ts` is declared
 * against. And that the schema's key set and the interface's member
 * set are the same set, so a fifth setting added to one and not the
 * other cannot ship.
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
 * Both tables carry both outcomes and a guard asserts it. A block of
 * nothing but refusals is fully green against a schema that refuses
 * everything, and a block of nothing but accepts against one that
 * accepts everything; the accepted rows and the refused rows are each
 * other's control. The open records get a stronger guard than that,
 * because their two failure modes are opposite: each needs an
 * accepted row carrying a key this service never declared AND a
 * refused row naming a path INSIDE it, or the table proves openness
 * without value checking or value checking without openness.
 *
 *
 * Mutation grid, measured over the 38 cases in this file with
 * `--reporter=json` and read as failed `fullName`s rather than as a
 * count. Ten legs on the module, in two classes, because the two
 * halves of the table are reddened by opposite mutations and a grid
 * made of one class leaves the other half green while looking
 * thorough.
 *
 * The six WIDENING legs each redden their own refusal and nothing
 * else: dropping `.strict()` from the settings object reddens the
 * undeclared top-level member, dropping it from the field spec
 * reddens the undeclared spec member, and replacing the weight, the
 * verdict entry and the display name with `z.unknown()` reddens one
 * row apiece. Replacing the field-type enum with `z.string()` is the
 * one that reddens two — the unknown type AND the spec naming no
 * type at all, which is what says those rows are the same check read
 * from two sides rather than two rows of one.
 *
 * The four NARROWING legs are aimed at the accepted side. Requiring
 * weights to be positive reddens exactly the negative and the zero
 * row and leaves the fully configured domain green, since its own
 * weights are positive. Dropping `findingsDisplayName` from the
 * schema reddens 5 — its two accepted rows, its refusal, and both
 * drift cases. Adding a fifth key to the schema reddens exactly ONE
 * case, the key-set equality, which is the whole of the evidence
 * that the drift case pins the schema rather than restating it.
 *
 * The fourth is the one worth reading rather than counting. Making
 * `findingsDisplayName` REQUIRED reddens 27 of 38, and most of them
 * are refusal rows: a refused row asserts the whole issue list, so a
 * second issue arriving beside the one it named fails it. That is
 * the table working as intended and not over-coverage — a refusal
 * for one reason and a refusal for two are different answers, and a
 * caller reading details cannot be told they are the same.
 *
 * What no module mutation reaches, by construction. The five table
 * guards and the field-type guard read only the tables beside them,
 * and are aimed at a later edit — an outcome side deleted whole, an
 * open record left with a row on only one of its two sides, a
 * refusal class dropped. And the two type-level pins are invisible
 * to the SUITE entirely: a fifth member on `DomainSettings` alone,
 * and a seventh member on `DomainFieldType` alone, each leave all 38
 * cases green and answer TS2322 at one line of this file, while a
 * name added to a table the interface does not carry answers TS2322
 * at the `satisfies`. All three measured.
 * Refusals are read as `code` and dotted field path and never as
 * zod's own `message`. The message is the member that quotes
 * submitted content, and pinning its wording would make a zod minor
 * a red suite here for no behaviour change.
 */
import type { DomainFieldType, DomainSettings } from '../db/schema/domains.js';
import type { ZodSafeParseResult } from 'zod';

import { describe, expect, it } from 'vitest';

import { domainSettingsSchema } from './settings-payload.js';

/** The two outcomes every table below has to carry rows for. */
const OUTCOMES = ['accepted', 'refused'];

/**
 * The members the schema declares, written out rather than read off
 * it, so this file pins the key set instead of agreeing with the
 * module about whatever it happens to hold.
 *
 * `satisfies` closes one direction at compile time: a name here that
 * `DomainSettings` does not carry fails to build, so the list cannot
 * drift ahead of the interface.
 * {@link SCHEMA_NAMES_EVERY_INTERFACE_MEMBER} closes the other.
 */
const DECLARED_MEMBERS = [
  'fieldContract',
  'findingsDisplayName',
  'scoringWeights',
  'verdictVocabulary',
] as const satisfies readonly (keyof DomainSettings)[];

/**
 * Whatever `DomainSettings` carries that {@link DECLARED_MEMBERS}
 * does not. `never` while the two agree.
 */
type UnlistedInterfaceMembers =
  Exclude<keyof DomainSettings, (typeof DECLARED_MEMBERS)[number]>;

/**
 * That {@link DECLARED_MEMBERS} names every member of the interface.
 *
 * The annotation is what does the work: with nothing left over the
 * conditional is `true` and the initializer type-checks, and the
 * moment a fifth member is added to `DomainSettings` alone it becomes
 * `false` and the assignment is a `check-types` error at this line.
 * Wrapped in tuples so a union member does not distribute the
 * conditional and answer `boolean`, which would accept the
 * initializer and pin nothing at all.
 */
type InterfaceFullyListed =
  [UnlistedInterfaceMembers] extends [never] ? true : false;

const SCHEMA_NAMES_EVERY_INTERFACE_MEMBER: InterfaceFullyListed = true;

/**
 * The field types a contract may declare, in the same shape and for
 * the same two reasons as {@link DECLARED_MEMBERS}: the `satisfies`
 * refuses a type the union never had, and
 * {@link SCHEMA_ACCEPTS_EVERY_FIELD_TYPE} refuses a union member this
 * table never exercises.
 */
const DECLARED_FIELD_TYPES = [
  'boolean',
  'datetime',
  'list',
  'number',
  'object',
  'string',
] as const satisfies readonly DomainFieldType[];

/**
 * Whatever `DomainFieldType` carries that
 * {@link DECLARED_FIELD_TYPES} does not. `never` while the two agree.
 */
type UnlistedFieldTypes =
  Exclude<DomainFieldType, (typeof DECLARED_FIELD_TYPES)[number]>;

/**
 * That every member of the field-type union is exercised below.
 *
 * The direction the module's own `satisfies` deliberately leaves
 * open. A seventh field type added to `DomainFieldType` and not to
 * the schema is a contract the route refuses for a reason nobody
 * intended, and this line is where that is reported.
 */
type FieldTypesFullyListed =
  [UnlistedFieldTypes] extends [never] ? true : false;

const SCHEMA_ACCEPTS_EVERY_FIELD_TYPE: FieldTypesFullyListed = true;

/**
 * A key no convention in this repo would produce, standing in for
 * the vocabulary an operator brings. Used as the key of both open
 * records below, and read back by the guard that proves each one is
 * open, so the table and the guard cannot disagree about which row
 * carried it.
 */
const OPERATOR_KEY = 'operator chose this';

/**
 * A domain that has configured all four settings, in the register
 * `data/domains.json` seeds: `recency` and `novelty` are the sort of
 * signal a radar scores on, `url` and `publishedAt` the sort of field
 * its contract is written for.
 *
 * One declaration, used as the payload submitted AND as the payload
 * expected back, because those are the same claim — nothing here is
 * defaulted, coerced or renamed on the way through. Written twice
 * they would be two literals free to drift into agreeing about a
 * member neither one exercises.
 */
const FULL_PAYLOAD: DomainSettings = {
  scoringWeights: { recency: 0.5, novelty: 1.25 },
  verdictVocabulary: ['avoid', 'caution', 'neutral', 'interested'],
  fieldContract: {
    url: { type: 'string', required: true },
    publishedAt: { type: 'datetime' },
  },
  findingsDisplayName: 'Signal',
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
    readonly parsed: DomainSettings;
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
 * `findingsDisplayName` on the way through.
 *
 * The two {@link OPERATOR_KEY} rows are the openness control. Their
 * keys are names this service has never heard of and never will, and
 * they are ACCEPTED — which is the setting working rather than a
 * gap in the table, and is why the refusals beneath them have to
 * reach INTO the same records to mean anything.
 */
const PAYLOAD_CASES: readonly PayloadCase[] = [
  {
    label: 'an empty payload', outcome: 'accepted',
    input: {}, parsed: {},
  },
  {
    label: 'a fully configured domain', outcome: 'accepted',
    input: FULL_PAYLOAD, parsed: FULL_PAYLOAD,
  },
  {
    label: 'a display name alone', outcome: 'accepted',
    input: { findingsDisplayName: 'Radar entry' },
    parsed: { findingsDisplayName: 'Radar entry' },
  },
  {
    label: 'a signal name this service never declared', outcome: 'accepted',
    input: { scoringWeights: { [OPERATOR_KEY]: 3 } },
    parsed: { scoringWeights: { [OPERATOR_KEY]: 3 } },
  },
  {
    label: 'a field name this service never declared', outcome: 'accepted',
    input: { fieldContract: { [OPERATOR_KEY]: { type: 'list' } } },
    parsed: { fieldContract: { [OPERATOR_KEY]: { type: 'list' } } },
  },
  {
    label: 'a negative weight', outcome: 'accepted',
    input: { scoringWeights: { paywalled: -2.5 } },
    parsed: { scoringWeights: { paywalled: -2.5 } },
  },
  {
    label: 'a weight of zero', outcome: 'accepted',
    input: { scoringWeights: { archived: 0 } },
    parsed: { scoringWeights: { archived: 0 } },
  },
  {
    label: 'a configured-to-nothing payload', outcome: 'accepted',
    input: { scoringWeights: {}, fieldContract: {}, verdictVocabulary: [] },
    parsed: { scoringWeights: {}, fieldContract: {}, verdictVocabulary: [] },
  },
  {
    label: 'a field a domain can do without', outcome: 'accepted',
    input: { fieldContract: { note: { type: 'string', required: false } } },
    parsed: { fieldContract: { note: { type: 'string', required: false } } },
  },
  {
    label: 'an undeclared top-level member', outcome: 'refused',
    input: { scoringWeigths: { recency: 1 } },
    code: 'unrecognized_keys', field: '',
  },
  {
    label: 'a payload that is not an object at all', outcome: 'refused',
    input: null, code: 'invalid_type', field: '',
  },
  {
    label: 'a non-numeric weight', outcome: 'refused',
    input: { scoringWeights: { recency: 'high' } },
    code: 'invalid_type', field: 'scoringWeights.recency',
  },
  {
    label: 'a weights record that is not an object', outcome: 'refused',
    input: { scoringWeights: [] },
    code: 'invalid_type', field: 'scoringWeights',
  },
  {
    label: 'an unknown field type', outcome: 'refused',
    input: { fieldContract: { url: { type: 'uuid' } } },
    code: 'invalid_value', field: 'fieldContract.url.type',
  },
  {
    label: 'a field spec naming no type at all', outcome: 'refused',
    input: { fieldContract: { url: { required: true } } },
    code: 'invalid_value', field: 'fieldContract.url.type',
  },
  {
    label: 'an undeclared member of a field spec', outcome: 'refused',
    input: { fieldContract: { url: { type: 'string', note: 'why' } } },
    code: 'unrecognized_keys', field: 'fieldContract.url',
  },
  {
    label: 'a field spec that is not an object', outcome: 'refused',
    input: { fieldContract: { url: 'string' } },
    code: 'invalid_type', field: 'fieldContract.url',
  },
  {
    label: 'a non-boolean required flag', outcome: 'refused',
    input: { fieldContract: { url: { type: 'string', required: 'yes' } } },
    code: 'invalid_type', field: 'fieldContract.url.required',
  },
  {
    label: 'a contract that is not an object', outcome: 'refused',
    input: { fieldContract: 'url' },
    code: 'invalid_type', field: 'fieldContract',
  },
  {
    label: 'a verdict that is not a string', outcome: 'refused',
    input: { verdictVocabulary: ['avoid', 2] },
    code: 'invalid_type', field: 'verdictVocabulary.1',
  },
  {
    label: 'a vocabulary that is not a list', outcome: 'refused',
    input: { verdictVocabulary: 'avoid' },
    code: 'invalid_type', field: 'verdictVocabulary',
  },
  {
    label: 'a display name that is not a string', outcome: 'refused',
    input: { findingsDisplayName: 5 },
    code: 'invalid_type', field: 'findingsDisplayName',
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
 * The two members whose keys the operator owns, as a route spells
 * them in `openPaths` minus the `settings.` prefix a body nests them
 * under.
 */
const OPEN_RECORDS = ['fieldContract', 'scoringWeights'];

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

/**
 * The keys one payload put in one open record, empty when it named
 * that record at all.
 *
 * Written as a branch over the two names rather than as an index,
 * because the members have different value types and the branch is
 * what keeps the guard reading the record it was asked about.
 */
function openKeysOf(payload: DomainSettings, record: string): string[] {
  const value = record === 'scoringWeights'
    ? payload.scoringWeights
    : payload.fieldContract;

  return Object.keys(value ?? {});
}

// ---------------------------------------------------------------------------
// domainSettingsSchema
// ---------------------------------------------------------------------------

describe('domainSettingsSchema', () => {
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
      'invalid_type', 'invalid_value', 'unrecognized_keys',
    ]);
  });

  it('brackets each open record from both sides', () => {
    // An accepted row whose key this service never declared proves
    // the record is open; a refused row naming a path INSIDE it
    // proves the values are still checked. Either side alone is
    // green against a schema that got exactly one of the two right.
    const bracketed = OPEN_RECORDS.map((record) => ({
      record,
      open: PAYLOAD_CASES.some(
        (row) => row.outcome === 'accepted'
          && openKeysOf(row.parsed, record).includes(OPERATOR_KEY),
      ),
      checked: REFUSED_CASES.some(
        (row) => row.field.startsWith(`${record}.`),
      ),
    }));

    expect(bracketed).toEqual(OPEN_RECORDS.map((record) => ({
      record, open: true, checked: true,
    })));
  });

  it('refuses each open record as a whole as well as inside it', () => {
    // The distinction `src/http/validation.ts` masks against: a
    // fault against the record ITSELF keeps its declared name, and
    // only a fault below it is the operator's key. A table with no
    // row of the first kind cannot tell the two apart.
    const whole = REFUSED_CASES.map((row) => row.field)
      .filter((field) => OPEN_RECORDS.includes(field));

    expect([...whole].sort()).toEqual(OPEN_RECORDS);
  });

  for (const row of PAYLOAD_CASES) {
    if (row.outcome === 'accepted') {
      it(`accepts ${row.label}`, () => {
        expect(domainSettingsSchema.parse(row.input)).toStrictEqual(row.parsed);
      });

      continue;
    }

    it(`refuses ${row.label}`, () => {
      const result = domainSettingsSchema.safeParse(row.input);

      expect(refusalOf(result)).toEqual([
        { code: row.code, field: row.field },
      ]);
    });
  }
});

// ---------------------------------------------------------------------------
// The field contract
// ---------------------------------------------------------------------------

describe('the field contract', () => {
  it('exercises every field type the union declares', () => {
    expect(SCHEMA_ACCEPTS_EVERY_FIELD_TYPE).toBe(true);
    expect(DECLARED_FIELD_TYPES.length)
      .toBe(new Set(DECLARED_FIELD_TYPES).size);
  });

  for (const type of DECLARED_FIELD_TYPES) {
    it(`accepts a field declared as ${type}`, () => {
      const parsed = domainSettingsSchema.parse({
        fieldContract: { measured: { type } },
      });

      expect(parsed).toStrictEqual({ fieldContract: { measured: { type } } });
    });
  }
});

// ---------------------------------------------------------------------------
// Drift against DomainSettings
// ---------------------------------------------------------------------------

describe('drift against the interface', () => {
  it('declares one key per interface member and no others', () => {
    // Two halves of one claim, reddening under different commands.
    // A key added to the schema alone fails the set equality below;
    // a member added to the interface alone makes the annotation on
    // that constant unsatisfiable, which only `check-types` reports.
    expect(SCHEMA_NAMES_EVERY_INTERFACE_MEMBER).toBe(true);
    expect(Object.keys(domainSettingsSchema.shape).sort())
      .toEqual([...DECLARED_MEMBERS].sort());
  });

  it('lets any single member be omitted from a full payload', () => {
    // Every member optional is what makes an absent one mean the
    // pipeline's own default applies, and it is what the column's
    // `{}` default rests on. Driven off the full payload's own keys
    // rather than named here, so a fifth member inherits the claim.
    const members = Object.keys(FULL_PAYLOAD);
    const withoutEach = members.map((omitted) => ({
      omitted,
      accepted: domainSettingsSchema.safeParse(Object.fromEntries(
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
    const body = { scoringWeights: { recency: 1 } };
    const parsed = domainSettingsSchema.parse(body);

    expect(parsed).toStrictEqual(body);
    expect(parsed).not.toBe(body);
    expect(parsed.scoringWeights).not.toBe(body.scoringWeights);
  });

  it('drops an own __proto__ inside an open record', () => {
    // Measured under zod 4.5.1 rather than chosen: the key is
    // removed before its value is ever checked, so a `__proto__`
    // whose value is not a number is ACCEPTED and stored as absent
    // rather than refused. Built through `JSON.parse` because that
    // is how body-parser produces one — in an object literal
    // `__proto__` sets the prototype instead of becoming an own
    // key, and the case would then measure the literal rather than
    // the schema.
    const onTheWire: unknown = JSON.parse(
      '{"scoringWeights":{"__proto__":"not a number","recency":3}}',
    );
    const parsed = domainSettingsSchema.parse(onTheWire);

    expect(parsed).toStrictEqual({ scoringWeights: { recency: 3 } });
    expect(Object.getPrototypeOf(parsed.scoringWeights)).toBe(Object.prototype);
  });
});
