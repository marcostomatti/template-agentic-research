/**
 * `parseBody` and `parseQuery` — the boundary every wave-1 route
 * reads a request through, and the only place a failed parse becomes
 * a refusal.
 *
 * Seven claims, and every one of them is a promise to a caller that
 * sees a status and a body and nothing else. That a parse which
 * succeeds answers the SCHEMA'S value rather than the one submitted,
 * defaults applied and coercions done, so a handler never re-reads
 * its own input. That a parse which fails throws the framework's
 * `ValidationError` and therefore a `422` carrying
 * `{ code, message, details }`, with no try/catch at the call site.
 * That every detail names the field that failed — by dotted path,
 * through objects and through array entries alike, and by a name of
 * this module's own when the fault is against the root, which has no
 * path. And that the message a detail carries is drawn from a fixed
 * vocabulary of this repo's own rather than from zod.
 *
 * Two of them are the sanitiser's, and both are about the PATH
 * rather than the message, because a path is the other place
 * submitted content arrives. That an `unrecognized_keys` detail
 * names the object which refused, never the key it refused. And
 * that every path segment below a prefix the caller declared open —
 * a record whose keys the operator chose and this service never
 * did — is reported as `*`.
 *
 * The seventh is the other six read from outside, and it is a claim
 * about the ENVELOPE rather than about a detail. One sentinel
 * string, submitted at every site a request can carry one — as a
 * field value, as an enum member, as an undeclared key and as a key
 * of an open record — occurs zero times in `JSON.stringify` of the
 * `ValidationError` the parser throws: `toJSON()` whole, `code` and
 * `message` included, since a leak into either reaches a caller as
 * surely as one into a detail. Counted rather than merely searched
 * for, so a row expecting four sites' worth of nothing cannot pass
 * on a reading that stopped at the first match.
 *
 * The vocabulary claim is the reason the module exists, so it is
 * asserted against zod rather than against a literal alone: every
 * refusal row re-parses its own value and asserts the answered
 * message is NOT the message zod raised for the same issue. A
 * vocabulary that had quietly become a passthrough would satisfy
 * every `field` and every `code` in this file and fail only there.
 * The wording itself is written down as five constants rather than
 * imported, so a reword in the module is a red case here and not a
 * silent agreement.
 *
 * The five tables are shaped by which half of a claim they can
 * carry. Every row of the refusal table has a non-empty
 * `issue.path`, so it says nothing about the root and both parsers
 * must answer it identically — which is why each row is driven
 * through BOTH, and why a guard asserts no row of it names a root.
 * The root table is the opposite and is only two rows, because the
 * whole claim there is that the two parsers name the root
 * DIFFERENTLY: one `body`, one `query`, from one shared
 * implementation. The sanitised table is driven through `parseBody`
 * alone, because neither sanitiser rule varies by parser: both act
 * on the path segments, which the two parsers share.
 *
 * Each sanitised row also carries the strings its value actually
 * submitted and asserts none of them reaches a detail — searching
 * the row's own value FIRST, so a row that quietly stopped
 * submitting one cannot pass by comparing two empty lists. That
 * subsumes the anti-zod leg for the six `unrecognized_keys` rows,
 * whose whole leak IS zod's wording: handing that wording back
 * reddens every one of their containment legs, measured. So those
 * rows do not repeat the anti-zod check, and the open-record rows
 * lean on the refusal table for it instead, which already carries
 * every code they raise.
 *
 * The containment table is the fifth and is not shaped like the
 * other four: every row submits the SAME string and what varies is
 * where it went. Four rows for the four sites, so a leak names the
 * channel it came out of, and a fifth submitting all four at once,
 * which is the only row that says they cannot leak in combination.
 * Each row also declares the sites it submits and is held to it —
 * the sentinel occurs in the serialised value exactly once per site
 * named — because a row that quietly stopped submitting one would
 * be answered an envelope with nothing to find and would pass.
 *
 * Its zeros are worth nothing on their own: a search that had
 * stopped matching answers zero for a leaking parser just as fast.
 * So four planted-leak legs build the same envelope around details
 * this module did not produce, and assert the search finds the
 * sentinel in a detail's field (the unmasked path zod itself
 * produced for the open-record row), in a detail's message (the
 * wording zod itself raised for the undeclared-key row, read back
 * off zod rather than pasted), in the envelope's own message, and
 * once per occurrence rather than once per envelope.
 *
 * Both outcomes are represented and guarded. A file of nothing but
 * refusals is fully green against a parser that refuses everything,
 * and a file of nothing but accepts against one that accepts
 * everything; the accepted rows and the refused rows are each
 * other's control.
 *
 * Mutation grid, re-measured whole over the 93 cases in this file
 * with `--reporter=json`, because the containment table's 19 cases
 * moved every figure the previous eight legs had recorded. Eight
 * legs on the module, and the two narrow ones are what is worth
 * reading rather than counting. Answering only the first issue
 * reddens 2 — `two faults in one body` and the at-once containment
 * row, which are together what pins a body with more than one
 * fault costing one round trip rather than one per fault. Naming a query's root `body` reddens exactly the
 * two query-root cases, so the body and query rows are each other's
 * control and neither could be dropped.
 *
 * The wide legs. Dropping the field path reddens 31; handing zod's
 * own message back reddens 37, and that is the leg which shows the
 * wording controls catching a passthrough independently of the
 * literals. Leaving the root unnamed reddens 8 — the two root rows
 * plus the six other cases whose fault is against a root.
 * Returning the submitted value instead of the parsed one reddens
 * 3 — the defaulted query, the coerced query and the options-bag
 * case — and not the four identity rows, which cannot see it at
 * all; that is the measurement behind this file keeping a
 * defaulting and a coercing schema in the accepted table.
 *
 * The two sanitiser legs are what this file was extended for, and
 * they are what the containment table now rests on. Neutralising
 * the collapse reddens 15: the five masked rows through both their
 * legs, the shortest-prefix case, and the open-record-key and
 * at-once containment rows through both of THEIRS — but NOT the
 * two leak controls, which expect the UNMASKED field and are
 * invisible to that leg by construction, which is exactly what
 * makes them controls rather than duplicates. Appending
 * `issue.keys` to the path — the leak the other rule exists to
 * prevent — reddens 17: five of the six undeclared-key rows
 * through both legs, the sixth through one, the query-root case,
 * and the undeclared-key and at-once containment rows through
 * both of theirs plus the envelope-shape row. That asymmetry is
 * the reading worth keeping. On `a key a strict object below an
 * open record does not declare` the appended key lands BELOW an
 * open prefix and is masked to `*`, so the field moves and nothing
 * leaks — the two rules compose, and that row is where the
 * measurement says so.
 *
 * So each of the two channels that CAN leak is caught by the
 * containment reading on its own: the path by the collapse leg,
 * the wording by the keys leg and by the zod-message leg. The
 * wording leg is the sharper reading of the two, because it
 * reddens the undeclared-key containment row and NOT the field
 * value, enum member or open-record rows — zod's own message for
 * those three carries nothing that was submitted, measured in the
 * same run.
 *
 * What no module mutation reaches, and why — 39 of the 93. The 15
 * table guards read only the tables beside them and are aimed at a
 * later edit rather than at the module. The 7 cross-parser
 * agreement rows compare two parsers to each other, so any change
 * degrading both equally is invisible to them by construction —
 * they pin that the pair share one implementation, not what that
 * implementation says. The two `422` and envelope rows assert the
 * framework's contract rather than this module's. `would have
 * carried the key had the message come from zod` asserts what ZOD
 * does, which is the fact the vocabulary answers to rather than a
 * behaviour of this module. And `leaves the value it was handed
 * untouched` needs a leg that mutates its argument, which none of
 * the eight does.
 *
 * Two members of that 39 are worth naming rather than counting,
 * because they read as a coverage hole and are not one. The four
 * planted-leak legs never call this module at all: they are the
 * control ON the search, and a leg that could redden them would be
 * measuring the wrong thing. And the containment legs for a field
 * value and for an enum member are reached by nothing in the grid
 * because no mutation of this module can make either arrive — zod
 * puts a submitted value in no path and in no message it raises,
 * measured. They pin a channel closed upstream, and they are what
 * would redden the day a detail started carrying `input` or
 * `received`.
 */
import type { ParseOptions } from './validation.js';
import type { FieldError } from '../../lib/errors/index.js';
import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ValidationError } from '../../lib/errors/index.js';

import { parseBody, parseQuery } from './validation.js';

/**
 * The module's message for `invalid_type`, written down rather than
 * imported. It covers a MISSING field and a wrong-typed one both,
 * because zod 4 raises the same code for each and puts nothing safe
 * on the issue that separates them.
 */
const MISSING_OR_WRONG_TYPE = 'Missing, or not of the expected type.';

/** The module's message for `invalid_value`, an enum's refusal. */
const NOT_AN_ACCEPTED_VALUE = 'Not one of the accepted values.';

/** The module's message for `too_small`. */
const BELOW_THE_MINIMUM = 'Below the allowed minimum.';

/** The module's message for `unrecognized_keys`. */
const AN_UNDECLARED_KEY = 'Carries a key this endpoint does not declare.';

/**
 * The module's message for `invalid_key`, which only an open record
 * can raise: it is what the record's own KEY schema refused.
 */
const A_REFUSED_KEY = 'Carries a key of the wrong type.';

/**
 * A key no schema in this file declares, submitted so that a strict
 * object refuses it. Distinctive enough that searching a detail for
 * it means something.
 */
const UNDECLARED = 'undeclaredMember';

/** A second one, for the object that submits two at once. */
const UNDECLARED_SIBLING = 'undeclaredSibling';

/**
 * A key inside an OPEN record — one the operator chose and this
 * service never declared, which is why a path carrying it is
 * submitted content in exactly the sense a value is.
 */
const OPERATOR_KEY = 'operatorChosenKey';

/** The two outcomes this file has to carry rows for. */
const OUTCOMES = ['accepted', 'refused'];

/**
 * A stand-in for a wave-1 request body, shaped like the smallest
 * real one: the three columns a term row carries, strict as every
 * request schema on this surface is.
 *
 * A fixture rather than the real schema from `src/taxonomy/`, which
 * does not exist yet — and which this file should not depend on
 * once it does. What is under test is the parser, and a parser that
 * only works against one schema is not one.
 */
const termSchema = z.object({
  pattern: z.string().min(1),
  polarity: z.enum(['positive', 'negative']),
  weight: z.number(),
}).strict();

/**
 * A body with {@link termSchema} nested under it twice, once as a
 * member and once inside an array, so a path can be asked to cross
 * both kinds of segment.
 */
const documentSchema = z.object({
  categoryKey: z.string(),
  head: termSchema,
  terms: z.array(termSchema),
}).strict();

/**
 * A query in the shape every list route's is: coerced, defaulted and
 * strict. Its default is what makes an accepted row able to say the
 * parsed value came back rather than the submitted one.
 */
const windowSchema = z.object({
  page: z.coerce.number().int()
    .positive()
    .default(1),
}).strict();

/**
 * A domain-settings-shaped body: two OPEN records — maps whose keys
 * the operator chose — under one declared member, which is where
 * `settings.scoringWeights` and `settings.fieldContract` actually
 * sit on a domain PATCH.
 */
const domainSchema = z.object({
  slug: z.string(),
  settings: z.object({
    scoringWeights: z.record(z.string(), z.number()),
    fieldContract: z.record(z.string(), z.enum(['text', 'number'])),
  }).strict(),
}).strict();

/** The prefixes a domains route declares open for {@link domainSchema}. */
const DOMAIN_OPEN_PATHS = [
  'settings.scoringWeights',
  'settings.fieldContract',
];

/**
 * An open record at the root of the parsed value whose KEY schema
 * can itself refuse — the operator-settings shape, and the only one
 * of the three that raises `invalid_key` at all.
 */
const channelsSchema = z.object({
  notificationChannels: z.record(z.string().regex(/^channel-/), z.boolean()),
}).strict();

/**
 * An open record whose VALUES are strict objects.
 *
 * No wave-1 payload is this deep — the three real ones hold a
 * number, an enum member and a boolean. It is here because the rule
 * is EVERY segment below the prefix, and this is the only shape
 * that can tell that rule from `the one segment directly below it`:
 * it produces a path with an operator key in the middle and a
 * declared name after it.
 */
const contractSchema = z.object({
  fieldContract: z.record(
    z.string(),
    z.object({ type: z.enum(['text', 'number']) }).strict(),
  ),
}).strict();

/** A term that satisfies {@link termSchema}. */
const VALID_TERM = { pattern: 'alpha', polarity: 'positive', weight: 1.5 };

/**
 * One refused value whose issues all carry a non-empty path, and the
 * details a caller is answered with.
 *
 * `schema` travels with the row because the four classes need three
 * different shapes between them, and a table that hid the schema
 * would make a row unreadable on its own.
 */
interface RefusalCase {
  readonly label: string;
  readonly schema: ZodType;
  readonly value: unknown;
  readonly details: readonly FieldError[];
}

/**
 * The refusals the vocabulary and the path builder have to answer,
 * one per class the four wave-1 resource groups will actually raise.
 *
 * The first two rows are the same `invalid_type` code and the same
 * message, differing only in the field — which is the collapse zod 4
 * made and this table is the record of it. The last row is the one
 * that says a body with two faults costs one round trip and not two.
 */
const REFUSAL_CASES: readonly RefusalCase[] = [
  {
    label: 'a missing required field',
    schema: termSchema,
    value: { polarity: 'positive', weight: 1 },
    details: [
      { field: 'pattern', message: MISSING_OR_WRONG_TYPE, code: 'invalid_type' },
    ],
  },
  {
    label: 'a field of the wrong type',
    schema: termSchema,
    value: { pattern: 'alpha', polarity: 'positive', weight: 'heavy' },
    details: [
      { field: 'weight', message: MISSING_OR_WRONG_TYPE, code: 'invalid_type' },
    ],
  },
  {
    label: 'a value outside an enum',
    schema: termSchema,
    value: { pattern: 'alpha', polarity: 'sideways', weight: 1 },
    details: [
      {
        field: 'polarity',
        message: NOT_AN_ACCEPTED_VALUE,
        code: 'invalid_value',
      },
    ],
  },
  {
    label: 'a fault under a nested object member',
    schema: documentSchema,
    value: {
      categoryKey: 'signals',
      head: { pattern: 'alpha', polarity: 'sideways', weight: 1 },
      terms: [],
    },
    details: [
      {
        field: 'head.polarity',
        message: NOT_AN_ACCEPTED_VALUE,
        code: 'invalid_value',
      },
    ],
  },
  {
    label: 'a fault under an array entry',
    schema: documentSchema,
    value: {
      categoryKey: 'signals',
      head: VALID_TERM,
      terms: [VALID_TERM, { pattern: 'beta', polarity: 'negative' }],
    },
    details: [
      {
        field: 'terms.1.weight',
        message: MISSING_OR_WRONG_TYPE,
        code: 'invalid_type',
      },
    ],
  },
  {
    label: 'a string below its minimum length',
    schema: termSchema,
    value: { pattern: '', polarity: 'positive', weight: 1 },
    details: [
      { field: 'pattern', message: BELOW_THE_MINIMUM, code: 'too_small' },
    ],
  },
  {
    label: 'two faults in one body',
    schema: termSchema,
    value: { polarity: 'sideways', weight: 1 },
    details: [
      { field: 'pattern', message: MISSING_OR_WRONG_TYPE, code: 'invalid_type' },
      {
        field: 'polarity',
        message: NOT_AN_ACCEPTED_VALUE,
        code: 'invalid_value',
      },
    ],
  },
];

/** One parser, under the name a detail gives the value it reads. */
interface RootCase {
  readonly label: string;
  readonly parse: typeof parseBody;
  readonly rootField: string;
}

/**
 * The two halves of a request, and the name each one's root takes.
 *
 * Two rows and no more, because the claim is exactly that they
 * DIFFER. One shared implementation answers both, so a root name
 * hard-coded in that implementation, or copied from one function to
 * the other, reddens one of these rows and nothing else in the file.
 *
 * The value driven through them is a string rather than an object,
 * which is the plainest way to raise an issue against the root: zod
 * reports it with an empty `issue.path`, and an empty path is the
 * whole reason the root needs a name.
 */
const ROOT_CASES: readonly RootCase[] = [
  { label: 'a body', parse: parseBody, rootField: 'body' },
  { label: 'a query', parse: parseQuery, rootField: 'query' },
];

/** One accepted value, and what the parser hands back for it. */
interface AcceptedCase {
  readonly label: string;
  readonly schema: ZodType;
  readonly value: unknown;
  readonly parsed: unknown;
}

/**
 * The values that get through, and what comes back out.
 *
 * The last three rows are the ones with a claim in them rather than
 * a tautology: a value the schema DEFAULTS and a value it COERCES
 * come back changed, so a parser that returned its own argument
 * would pass the first two rows and fail these.
 */
const ACCEPTED_CASES: readonly AcceptedCase[] = [
  {
    label: 'a body satisfying every field',
    schema: termSchema,
    value: VALID_TERM,
    parsed: VALID_TERM,
  },
  {
    label: 'a body nesting one schema under another',
    schema: documentSchema,
    value: { categoryKey: 'signals', head: VALID_TERM, terms: [VALID_TERM] },
    parsed: { categoryKey: 'signals', head: VALID_TERM, terms: [VALID_TERM] },
  },
  {
    label: 'an absent query, which is what a list route sees most',
    schema: windowSchema,
    value: {},
    parsed: { page: 1 },
  },
  {
    label: 'a query whose value the schema coerces',
    schema: windowSchema,
    value: { page: '3' },
    parsed: { page: 3 },
  },
  {
    label: 'a body carrying a number the schema leaves alone',
    schema: termSchema,
    value: { pattern: 'beta', polarity: 'negative', weight: 0 },
    parsed: { pattern: 'beta', polarity: 'negative', weight: 0 },
  },
];

/**
 * One refused value whose detail is shaped by the SANITISER rather
 * than by the vocabulary alone, and what it was answered with.
 *
 * `submitted` is the strings this row's value actually carried and
 * that no detail may repeat. Every row has at least one, so no row
 * can pass its containment leg by searching for a string it never
 * sent, and a table guard holds each one against the row's own
 * value rather than trusting the list.
 */
interface SanitisedCase {
  readonly label: string;
  readonly schema: ZodType;
  readonly value: unknown;
  readonly options: ParseOptions;
  readonly details: readonly FieldError[];
  readonly submitted: readonly string[];
}

/**
 * The two sanitiser rules, one row per shape that raises them.
 *
 * The first four rows are the `unrecognized_keys` rule: the field
 * is the object that REFUSED, and it is that because the field is
 * built from `issue.path` and nothing else. Measured under zod
 * 4.5.1, that path is already the container — empty at the root,
 * `head` for a nested member, `terms.0` for an array entry — while
 * the key itself lives only in `issue.keys` and in the message zod
 * would have handed back. The two-key row is the one that says zod
 * raises ONE issue per container however many keys it refused, so
 * a caller reads one detail rather than a list of its own typos.
 *
 * The rest are the open-record rule. `settings.scoringWeights` and
 * `settings.fieldContract` reach a detail with an operator-chosen
 * key in the middle of the path, and every segment below the
 * declared prefix is `*`. Two rows are there to say what the rule
 * does NOT do: a fault against the record AS A WHOLE still names
 * it (`settings.scoringWeights`, no `*`), and a strict object
 * nested below an open record answers `fieldContract.*` — both
 * rules acting on one path.
 *
 * Rows are driven through `parseBody` alone. Which parser named a
 * ROOT is the other table's claim, and neither rule here varies by
 * it: both act on the path segments, which the two parsers share.
 */
const SANITISED_CASES: readonly SanitisedCase[] = [
  {
    label: 'a key the root object does not declare',
    schema: termSchema,
    value: { ...VALID_TERM, [UNDECLARED]: 'x' },
    options: {},
    details: [
      { field: 'body', message: AN_UNDECLARED_KEY, code: 'unrecognized_keys' },
    ],
    submitted: [UNDECLARED],
  },
  {
    label: 'two keys the root object does not declare',
    schema: termSchema,
    value: { ...VALID_TERM, [UNDECLARED]: 1, [UNDECLARED_SIBLING]: 2 },
    options: {},
    details: [
      { field: 'body', message: AN_UNDECLARED_KEY, code: 'unrecognized_keys' },
    ],
    submitted: [UNDECLARED, UNDECLARED_SIBLING],
  },
  {
    label: 'a key a nested object does not declare',
    schema: documentSchema,
    value: {
      categoryKey: 'signals',
      head: { ...VALID_TERM, [UNDECLARED]: 1 },
      terms: [],
    },
    options: {},
    details: [
      { field: 'head', message: AN_UNDECLARED_KEY, code: 'unrecognized_keys' },
    ],
    submitted: [UNDECLARED],
  },
  {
    label: 'a key an array entry does not declare',
    schema: documentSchema,
    value: {
      categoryKey: 'signals',
      head: VALID_TERM,
      terms: [{ ...VALID_TERM, [UNDECLARED]: 1 }],
    },
    options: {},
    details: [
      {
        field: 'terms.0',
        message: AN_UNDECLARED_KEY,
        code: 'unrecognized_keys',
      },
    ],
    submitted: [UNDECLARED],
  },
  {
    label: 'a key beside the open records, on a body that declares them',
    schema: domainSchema,
    value: {
      slug: 'example-tech-radar',
      settings: { scoringWeights: {}, fieldContract: {}, [UNDECLARED]: 1 },
    },
    options: { openPaths: DOMAIN_OPEN_PATHS },
    details: [
      {
        field: 'settings',
        message: AN_UNDECLARED_KEY,
        code: 'unrecognized_keys',
      },
    ],
    submitted: [UNDECLARED],
  },
  {
    label: 'an open record entry of the wrong type',
    schema: domainSchema,
    value: {
      slug: 'example-tech-radar',
      settings: {
        scoringWeights: { [OPERATOR_KEY]: 'heavy' },
        fieldContract: {},
      },
    },
    options: { openPaths: DOMAIN_OPEN_PATHS },
    details: [
      {
        field: 'settings.scoringWeights.*',
        message: MISSING_OR_WRONG_TYPE,
        code: 'invalid_type',
      },
    ],
    submitted: [OPERATOR_KEY],
  },
  {
    label: 'an open record entry outside its enum',
    schema: domainSchema,
    value: {
      slug: 'example-tech-radar',
      settings: {
        scoringWeights: {},
        fieldContract: { [OPERATOR_KEY]: 'blob' },
      },
    },
    options: { openPaths: DOMAIN_OPEN_PATHS },
    details: [
      {
        field: 'settings.fieldContract.*',
        message: NOT_AN_ACCEPTED_VALUE,
        code: 'invalid_value',
      },
    ],
    submitted: [OPERATOR_KEY],
  },
  {
    label: 'an open record that is not an object at all',
    schema: domainSchema,
    value: {
      slug: 'example-tech-radar',
      settings: { scoringWeights: 'notARecord', fieldContract: {} },
    },
    options: { openPaths: DOMAIN_OPEN_PATHS },
    details: [
      {
        field: 'settings.scoringWeights',
        message: MISSING_OR_WRONG_TYPE,
        code: 'invalid_type',
      },
    ],
    submitted: ['notARecord'],
  },
  {
    label: 'a key the key schema of an open record refuses',
    schema: channelsSchema,
    value: { notificationChannels: { [OPERATOR_KEY]: true } },
    options: { openPaths: ['notificationChannels'] },
    details: [
      {
        field: 'notificationChannels.*',
        message: A_REFUSED_KEY,
        code: 'invalid_key',
      },
    ],
    submitted: [OPERATOR_KEY],
  },
  {
    label: 'a key a strict object below an open record does not declare',
    schema: contractSchema,
    value: {
      fieldContract: { [OPERATOR_KEY]: { type: 'text', [UNDECLARED]: 1 } },
    },
    options: { openPaths: ['fieldContract'] },
    details: [
      {
        field: 'fieldContract.*',
        message: AN_UNDECLARED_KEY,
        code: 'unrecognized_keys',
      },
    ],
    submitted: [OPERATOR_KEY, UNDECLARED],
  },
  {
    label: 'a declared member below an open record entry',
    schema: contractSchema,
    value: { fieldContract: { [OPERATOR_KEY]: { type: 'blob' } } },
    options: { openPaths: ['fieldContract'] },
    details: [
      {
        field: 'fieldContract.*.*',
        message: NOT_AN_ACCEPTED_VALUE,
        code: 'invalid_value',
      },
    ],
    submitted: [OPERATOR_KEY, 'blob'],
  },
];

/**
 * One string, submitted at every site a request can carry one, and
 * the only string this file searches a whole refusal envelope for.
 *
 * Distinctive enough that any occurrence in a serialised error is
 * unambiguous, and legal at once as a key, as an enum submission
 * and as a field value — which is what lets all four sites carry
 * the SAME string and makes one search cover them together.
 */
const SENTINEL = 'sentinel-value-no-detail-may-repeat';

/**
 * The four places a request can put a string, named so the table
 * below can be held against them.
 *
 * Not four spellings of one claim: each is a different channel out
 * of the parser, and a rule closing one says nothing about the
 * others. A field VALUE and an enum member reach zod as data and
 * appear in no issue's path at all. An undeclared KEY appears in
 * zod's own wording and nowhere else. An open-record key appears
 * in the PATH, which no message vocabulary can reach.
 */
const CONTAINMENT_SITES = [
  'a field value',
  'an enum member',
  'an open-record key',
  'an unrecognized key',
];

/**
 * A body carrying all four sites at once: a declared field whose
 * type can be wrong, a declared enum, an open record, and the
 * strictness that refuses everything else.
 *
 * One schema for the whole table, so a row differs from its
 * neighbours only in WHERE the sentinel went — which is the axis
 * the table is about.
 */
const containmentSchema = z.object({
  weight: z.number(),
  polarity: z.enum(['positive', 'negative']),
  scoringWeights: z.record(z.string(), z.number()),
}).strict();

/** What a route declares open for {@link containmentSchema}. */
const CONTAINMENT_OPTIONS: ParseOptions = { openPaths: ['scoringWeights'] };

/**
 * The body whose ONLY fault is an undeclared key spelled by the
 * sentinel.
 *
 * Named rather than inlined because two readings need the same
 * value: the table row that asserts the refusal contains it, and
 * the planted leg that reads zod's own wording for it back out of
 * zod. A second literal would let the two drift and the leg would
 * still pass.
 */
const UNDECLARED_SENTINEL_BODY = {
  weight: 1,
  polarity: 'positive',
  scoringWeights: {},
  [SENTINEL]: 1,
};

/**
 * One value carrying {@link SENTINEL} at one or more of
 * {@link CONTAINMENT_SITES}, and the fields the refusal names.
 *
 * `sites` is what the row CLAIMS to submit and is checked against
 * the value rather than believed: the sentinel occurs in the
 * serialised value exactly `sites.length` times.
 *
 * `fields` is not decoration either. It is what says the row was
 * still refused, and where — a value that quietly started passing
 * would contain the sentinel in an envelope that was never built,
 * which is the one way a containment assertion can be green for
 * nothing.
 */
interface ContainmentCase {
  readonly label: string;
  readonly sites: readonly string[];
  readonly value: unknown;
  readonly fields: readonly string[];
}

/**
 * One sentinel, every site it can be submitted at, and the fields
 * the caller is answered with instead.
 *
 * The four single-site rows say WHICH channel leaked when one does.
 * The fifth submits all four at once and is the only row that says
 * they cannot leak in combination: a parser answering one detail
 * out of four, or masking the path of the one row that reaches it,
 * would satisfy every other row here.
 *
 * The field expectations are measured rather than predicted. Zod
 * raises the four issues in the schema's own declaration order with
 * `unrecognized_keys` last, so the at-once row reads `weight`,
 * `polarity`, `scoringWeights.*`, `body` — one detail per site, and
 * the collapse acting on exactly the one path that carries an
 * operator-chosen segment.
 *
 * Rows are driven through `parseBody` alone, for the reason the
 * sanitised table gives: what a parser names a ROOT is that table's
 * claim, and nothing here varies by it.
 */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'the sentinel as a field value',
    sites: ['a field value'],
    value: { weight: SENTINEL, polarity: 'positive', scoringWeights: {} },
    fields: ['weight'],
  },
  {
    label: 'the sentinel as an enum member',
    sites: ['an enum member'],
    value: { weight: 1, polarity: SENTINEL, scoringWeights: {} },
    fields: ['polarity'],
  },
  {
    label: 'the sentinel as an open-record key',
    sites: ['an open-record key'],
    value: {
      weight: 1,
      polarity: 'positive',
      scoringWeights: { [SENTINEL]: 'heavy' },
    },
    fields: ['scoringWeights.*'],
  },
  {
    label: 'the sentinel as an unrecognized key',
    sites: ['an unrecognized key'],
    value: UNDECLARED_SENTINEL_BODY,
    fields: ['body'],
  },
  {
    label: 'the sentinel at every site at once',
    sites: CONTAINMENT_SITES,
    value: {
      weight: SENTINEL,
      polarity: SENTINEL,
      scoringWeights: { [SENTINEL]: 'heavy' },
      [SENTINEL]: 1,
    },
    fields: ['weight', 'polarity', 'scoringWeights.*', 'body'],
  },
];

/**
 * The details a refused parse answered with.
 *
 * A parse that SUCCEEDED answers an empty list rather than throwing,
 * so a case expecting a refusal fails on the empty list — naming
 * what it wanted — instead of on a narrowing error. Anything thrown
 * that is not a `ValidationError` is re-thrown rather than absorbed:
 * a `TypeError` from inside the parser is a failure of this module
 * and must not read as a refusal it produced on purpose.
 */
function refusalOf(run: () => unknown): FieldError[] {
  try {
    run();
  } catch (err) {
    if (err instanceof ValidationError) {
      return err.details ?? [];
    }

    throw err;
  }

  return [];
}

/**
 * The messages ZOD would have answered for the same value — the
 * strings `zodToValidationError` copies verbatim, and the ones no
 * detail in this file may equal.
 */
function zodMessagesFor(schema: ZodType, value: unknown): string[] {
  const result = schema.safeParse(value);

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => issue.message);
}

/**
 * How many times {@link SENTINEL} occurs in a string.
 *
 * A count rather than a boolean, because one function has to answer
 * both halves of the reading: zero over an answered envelope, and a
 * known positive number over a planted one and over the row's own
 * value. A containment assertion written as `not.toContain` could
 * only ever say the first, and a search that had quietly stopped
 * matching would satisfy it.
 */
function sentinelHits(text: string): number {
  return text.split(SENTINEL).length - 1;
}

/**
 * The whole refusal a parse answered with, serialised exactly as
 * `errorHandler` puts it on the wire.
 *
 * `toJSON()` rather than the details alone: the envelope also
 * carries `code` and `message`, and a leak into either reaches a
 * caller just as surely as one into a detail.
 *
 * Throws when the run was NOT refused, rather than answering an
 * empty string. A row whose value quietly started passing then
 * fails here naming that, instead of reporting zero occurrences of
 * a sentinel in an envelope nothing ever built.
 */
function envelopeOf(run: () => unknown): string {
  try {
    run();
  } catch (err) {
    if (err instanceof ValidationError) {
      return JSON.stringify(err.toJSON());
    }

    throw err;
  }

  throw new Error('expected the parse to be refused, and it was not');
}

/**
 * The same envelope, built by hand around details this module did
 * not produce.
 *
 * What the planted-leak legs search. It goes through the
 * framework's own `ValidationError.toJSON()` and the same
 * `JSON.stringify`, so a leg says the SEARCH would find a leak in a
 * real envelope rather than in a string assembled for the occasion.
 *
 * @param details - The details to plant.
 * @param message - The envelope's own message, defaulting to the
 *   one {@link parseBody} throws.
 */
function plantedEnvelope(
  details: readonly FieldError[],
  message = 'Validation failed',
): string {
  return JSON.stringify(new ValidationError(message, [...details]).toJSON());
}

/** The outcomes this file carries rows for, deduplicated and sorted. */
function outcomesCovered(): string[] {
  const outcomes = [
    ...ACCEPTED_CASES.map(() => 'accepted'),
    ...REFUSAL_CASES.map(() => 'refused'),
  ];

  return [...new Set(outcomes)].sort();
}

// ---------------------------------------------------------------------------
// The tables
// ---------------------------------------------------------------------------

describe('the case tables', () => {
  it('carries rows for both outcomes', () => {
    expect(outcomesCovered()).toEqual(OUTCOMES);
  });

  it('labels every row distinctly', () => {
    const labels = [
      ...ACCEPTED_CASES.map((row) => row.label),
      ...REFUSAL_CASES.map((row) => row.label),
      ...ROOT_CASES.map((row) => row.label),
      ...SANITISED_CASES.map((row) => row.label),
      ...CONTAINMENT_CASES.map((row) => row.label),
    ];

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('names each of the four classes the task owes', () => {
    const codes = REFUSAL_CASES.flatMap(
      (row) => row.details.map((detail) => detail.code),
    );

    expect([...new Set(codes)].sort()).toEqual([
      'invalid_type',
      'invalid_value',
      'too_small',
    ]);
  });

  it('refuses only against paths, never against a root', () => {
    const rooted = REFUSAL_CASES.filter(
      (row) => row.details.some(
        (detail) => ROOT_CASES.some((root) => root.rootField === detail.field),
      ),
    );

    expect(rooted.map((row) => row.label)).toEqual([]);
  });

  it('crosses an object member and an array entry', () => {
    const fields = REFUSAL_CASES.flatMap(
      (row) => row.details.map((detail) => detail.field),
    );

    expect(fields).toContain('head.polarity');
    expect(fields).toContain('terms.1.weight');
  });

  it('carries one row answering more than a single detail', () => {
    const plural = REFUSAL_CASES.filter((row) => row.details.length > 1);

    expect(plural.length).toBeGreaterThan(0);
  });

  it('gives the two halves of a request different root names', () => {
    const roots = ROOT_CASES.map((row) => row.rootField);

    expect([...new Set(roots)].sort()).toEqual(['body', 'query']);
  });

  it('carries rows for both sanitiser rules', () => {
    const undeclared = SANITISED_CASES.filter(
      (row) => row.details.some(
        (detail) => detail.code === 'unrecognized_keys',
      ),
    );
    const masked = SANITISED_CASES.filter(
      (row) => row.details.some((detail) => detail.field.includes('*')),
    );

    expect(undeclared.length).toBeGreaterThan(0);
    expect(masked.length).toBeGreaterThan(0);
  });

  it('declares an open prefix on some sanitised rows and not others', () => {
    const declared = SANITISED_CASES.filter(
      (row) => (row.options.openPaths ?? []).length > 0,
    );

    // Both halves are needed and for different reasons. A row with
    // no prefix is what says the `unrecognized_keys` rule costs a
    // caller nothing to get; a row with one is the only kind that
    // can exercise the collapse at all.
    expect(declared.length).toBeGreaterThan(0);
    expect(declared.length).toBeLessThan(SANITISED_CASES.length);
  });

  it('has every sanitised row submit something it must not be told back', () => {
    const empty = SANITISED_CASES.filter((row) => row.submitted.length === 0);

    expect(empty.map((row) => row.label)).toEqual([]);
  });

  it('expects no sanitised detail to repeat what its row submitted', () => {
    // Aimed at a later edit rather than at the module: a row
    // repaired by pasting the field a leaking parser answered would
    // be green everywhere else in this file, and red only here.
    const leaking = SANITISED_CASES.filter((row) => {
      const expected = JSON.stringify(row.details);

      return row.submitted.some((name) => expected.includes(name));
    });

    expect(leaking.map((row) => row.label)).toEqual([]);
  });

  it('submits the sentinel at every site a request has', () => {
    const sites = CONTAINMENT_CASES.flatMap((row) => row.sites);

    expect([...new Set(sites)].sort()).toEqual(CONTAINMENT_SITES);
  });

  it('carries one containment row submitting every site at once', () => {
    const whole = CONTAINMENT_CASES.filter(
      (row) => row.sites.length === CONTAINMENT_SITES.length,
    );

    expect(whole.length).toBe(1);
  });

  it('has every containment row submit its declared sites and no more', () => {
    // The anti-vacuity guard for the search: a row that stopped
    // submitting the sentinel at one of its sites would be answered
    // an envelope with nothing to find and would pass its own
    // containment leg. Held against the VALUE, so the count cannot
    // be kept true by editing the list.
    const disagreeing = CONTAINMENT_CASES.filter(
      (row) => sentinelHits(JSON.stringify(row.value)) !== row.sites.length,
    );

    expect(disagreeing.map((row) => row.label)).toEqual([]);
  });

  it('expects no containment field to repeat the sentinel', () => {
    // Aimed at a later edit, like its sanitised counterpart: a row
    // repaired by pasting the field a leaking parser answered would
    // be green everywhere else in this file and red only here.
    const leaking = CONTAINMENT_CASES.filter(
      (row) => row.fields.some((field) => field.includes(SENTINEL)),
    );

    expect(leaking.map((row) => row.label)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// What gets through
// ---------------------------------------------------------------------------

describe('a parse that succeeds', () => {
  for (const row of ACCEPTED_CASES) {
    it(`answers the parsed value for ${row.label}`, () => {
      expect(parseBody(row.schema, row.value)).toStrictEqual(row.parsed);
      expect(parseQuery(row.schema, row.value)).toStrictEqual(row.parsed);
    });
  }

  it('leaves the value it was handed untouched', () => {
    const value = { page: '3' };

    parseQuery(windowSchema, value);

    expect(value).toStrictEqual({ page: '3' });
  });

  it('accepts an options bag with nothing in it', () => {
    expect(parseBody(termSchema, VALID_TERM, {})).toStrictEqual(VALID_TERM);
    expect(parseQuery(windowSchema, {}, {})).toStrictEqual({ page: 1 });
  });
});

// ---------------------------------------------------------------------------
// What is refused, and what the refusal is allowed to say
// ---------------------------------------------------------------------------

describe('a parse that fails', () => {
  for (const row of REFUSAL_CASES) {
    it(`answers a detail per issue for ${row.label}`, () => {
      expect(refusalOf(() => parseBody(row.schema, row.value)))
        .toEqual(row.details);
    });

    it(`answers the same detail through either parser for ${row.label}`, () => {
      expect(refusalOf(() => parseQuery(row.schema, row.value)))
        .toEqual(refusalOf(() => parseBody(row.schema, row.value)));
    });

    it(`answers none of zod's own wording for ${row.label}`, () => {
      const answered = refusalOf(() => parseBody(row.schema, row.value))
        .map((detail) => detail.message);
      const raised = zodMessagesFor(row.schema, row.value);

      // The control on the control: zod raised as many issues as the
      // row expects details, so a row whose value stopped failing
      // cannot pass this by comparing two empty lists.
      expect(raised.length).toBe(row.details.length);
      expect(answered.filter((message) => raised.includes(message)))
        .toEqual([]);
    });
  }

  it('throws the error the framework answers 422 for', () => {
    expect(() => parseBody(termSchema, {})).toThrow(ValidationError);
  });

  it('carries the whole failure envelope on the thrown error', () => {
    let thrown: ValidationError | null = null;

    try {
      parseBody(termSchema, { ...VALID_TERM, polarity: 'sideways' });
    } catch (err) {
      thrown = err instanceof ValidationError
        ? err
        : null;
    }

    expect(thrown?.statusCode).toBe(422);
    expect(Object.keys(thrown?.toJSON() ?? {}).sort())
      .toEqual(['code', 'details', 'message']);
    expect(thrown?.toJSON().code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// The root, which has no path of its own
// ---------------------------------------------------------------------------

describe('an issue raised against the root', () => {
  for (const row of ROOT_CASES) {
    it(`names ${row.label} by the parser that read it`, () => {
      const details = refusalOf(() => row.parse(termSchema, 'not an object'));

      expect(details).toEqual([
        {
          field: row.rootField,
          message: MISSING_OR_WRONG_TYPE,
          code: 'invalid_type',
        },
      ]);
    });

    it(`gives ${row.label} a name zod did not supply`, () => {
      // Zod reports a root issue with an EMPTY path, which is what
      // `zodToValidationError` would turn into `field: ''`. The name
      // is this module's, and this is the row that says so.
      const raised = termSchema.safeParse('not an object');
      const paths = raised.success
        ? []
        : raised.error.issues.map((issue) => issue.path.length);

      expect(paths).toEqual([0]);
      expect(row.rootField).not.toBe('');
    });
  }
});

// ---------------------------------------------------------------------------
// What the sanitiser removes from a path
// ---------------------------------------------------------------------------

describe('a detail whose path the sanitiser shaped', () => {
  for (const row of SANITISED_CASES) {
    it(`answers ${row.label} against a safe path`, () => {
      expect(refusalOf(() => parseBody(row.schema, row.value, row.options)))
        .toEqual(row.details);
    });

    it(`tells the caller back none of ${row.label}`, () => {
      const answered = JSON.stringify(
        refusalOf(() => parseBody(row.schema, row.value, row.options)),
      );
      const value = JSON.stringify(row.value);

      // The control on the control: the value really did carry
      // every name, so a row that stopped submitting one cannot
      // pass by searching a detail for a string it never sent.
      expect(row.submitted.filter((name) => value.includes(name)))
        .toEqual([...row.submitted]);
      expect(row.submitted.filter((name) => answered.includes(name)))
        .toEqual([]);
    });
  }

  it('would have carried the key had the message come from zod', () => {
    // The one issue kind whose own wording IS the leak, which is
    // what makes the vocabulary load-bearing here rather than
    // merely house style. `zodToValidationError` in
    // `lib/errors/handler.ts` copies this string verbatim.
    const leaky = { ...VALID_TERM, [UNDECLARED]: 1 };
    const raised = zodMessagesFor(termSchema, leaky);

    expect(raised.length).toBe(1);
    expect(raised.every((message) => message.includes(UNDECLARED))).toBe(true);
    expect(AN_UNDECLARED_KEY).not.toContain(UNDECLARED);
  });

  it('names the query root for a parameter no query schema declares', () => {
    // Express 5 runs the `simple` query parser here, so `?page[]=1`
    // arrives as the literal key `page[]` and a strict query schema
    // refuses it as an undeclared key rather than as anything about
    // arrays. The parameter name is submitted content like any
    // other.
    const details = refusalOf(
      () => parseQuery(windowSchema, { 'page[]': '1' }),
    );

    expect(details).toEqual([
      { field: 'query', message: AN_UNDECLARED_KEY, code: 'unrecognized_keys' },
    ]);
    expect(JSON.stringify(details)).not.toContain('page[]');
  });
});

// ---------------------------------------------------------------------------
// The controls that make the collapse mean something
// ---------------------------------------------------------------------------

describe('the collapse to `*`', () => {
  /** The domain body whose weight map carries one operator key. */
  const weighted = {
    slug: 'example-tech-radar',
    settings: {
      scoringWeights: { [OPERATOR_KEY]: 'heavy' },
      fieldContract: {},
    },
  };

  it('is what removes the key, and not the schema', () => {
    // The leak this option closes, shown happening. Without a
    // declared prefix the operator's key IS the last path segment,
    // so the masked rows above cannot be passing for some other
    // reason.
    const details = refusalOf(() => parseBody(domainSchema, weighted));

    expect(details.map((detail) => detail.field))
      .toEqual([`settings.scoringWeights.${OPERATOR_KEY}`]);
  });

  it('matches a prefix a segment at a time, not as a string', () => {
    // `scoringWeight` is a string prefix of `scoringWeights` and
    // names nothing. Were matching done over the joined path, a
    // declared sibling called `scoringWeightsV2` would be masked
    // for no reason at all.
    const details = refusalOf(
      () => parseBody(domainSchema, weighted, {
        openPaths: ['settings.scoringWeight'],
      }),
    );

    expect(details.map((detail) => detail.field))
      .toEqual([`settings.scoringWeights.${OPERATOR_KEY}`]);
  });

  it('takes the shortest of two prefixes that both match', () => {
    // A caller that declared `settings` open has said everything
    // below it is the operator's, and a second, longer declaration
    // cannot narrow that back down.
    const details = refusalOf(
      () => parseBody(domainSchema, weighted, {
        openPaths: ['settings.scoringWeights', 'settings'],
      }),
    );

    expect(details.map((detail) => detail.field)).toEqual(['settings.*.*']);
  });

  it('leaves a path with no open prefix above it alone', () => {
    const details = refusalOf(
      () => parseBody(documentSchema, {
        categoryKey: 'signals',
        head: VALID_TERM,
        terms: [VALID_TERM, { pattern: 'beta', polarity: 'negative' }],
      }, { openPaths: DOMAIN_OPEN_PATHS }),
    );

    expect(details.map((detail) => detail.field)).toEqual(['terms.1.weight']);
  });

  it('changes nothing about a value the schema accepts', () => {
    const accepted = parseBody(domainSchema, {
      slug: 'example-tech-radar',
      settings: { scoringWeights: { [OPERATOR_KEY]: 2 }, fieldContract: {} },
    }, { openPaths: DOMAIN_OPEN_PATHS });

    // The masking is a property of a DETAIL, not of the parse. A
    // key the operator chose survives into the parsed value, which
    // is the whole reason the record is open.
    expect(accepted).toStrictEqual({
      slug: 'example-tech-radar',
      settings: { scoringWeights: { [OPERATOR_KEY]: 2 }, fieldContract: {} },
    });
  });
});

// ---------------------------------------------------------------------------
// One sentinel, submitted at every site a request has
// ---------------------------------------------------------------------------

describe('one sentinel, submitted at every site', () => {
  for (const row of CONTAINMENT_CASES) {
    it(`refuses ${row.label}, naming fields of its own`, () => {
      const details = refusalOf(
        () => parseBody(containmentSchema, row.value, CONTAINMENT_OPTIONS),
      );

      // WHICH fields, not merely that there were some. This is what
      // says the value still fails and where, and it is the reading
      // the containment leg beside it rests on.
      expect(details.map((detail) => detail.field)).toEqual(row.fields);
    });

    it(`keeps ${row.label} out of the whole envelope`, () => {
      const envelope = envelopeOf(
        () => parseBody(containmentSchema, row.value, CONTAINMENT_OPTIONS),
      );

      // The control on the control: the value really did carry the
      // sentinel once per site it names, so a row that stopped
      // submitting one cannot pass by searching an envelope for a
      // string nobody sent.
      expect(sentinelHits(JSON.stringify(row.value))).toBe(row.sites.length);
      expect(sentinelHits(envelope)).toBe(0);
    });
  }

  it('is searched over the envelope, not over the details alone', () => {
    // What the zeros above were measured over, pinned whole. The
    // right-hand side is built through the framework's own error
    // rather than by reading this one, so an envelope that had lost
    // its `code`, its `message` or a detail would not be answering
    // the same string.
    const envelope = envelopeOf(
      () => parseBody(
        containmentSchema,
        UNDECLARED_SENTINEL_BODY,
        CONTAINMENT_OPTIONS,
      ),
    );

    expect(envelope).toBe(plantedEnvelope([
      { field: 'body', message: AN_UNDECLARED_KEY, code: 'unrecognized_keys' },
    ]));
  });
});

// ---------------------------------------------------------------------------
// The planted leak that makes those zeros mean something
// ---------------------------------------------------------------------------

describe('a sentinel planted in an envelope', () => {
  it('is found in a detail field', () => {
    // The field zod's own path produces for the open-record row,
    // which is exactly what the collapse to `*` removes. The row
    // above asserts `scoringWeights.*`; this is that path unmasked,
    // and this leg is what says the search would have caught it.
    const planted = plantedEnvelope([
      {
        field: `scoringWeights.${SENTINEL}`,
        message: MISSING_OR_WRONG_TYPE,
        code: 'invalid_type',
      },
    ]);

    expect(sentinelHits(planted)).toBe(1);
  });

  it('is found in a detail message', () => {
    // Not a hypothetical wording. This is the string zod raised for
    // the undeclared-key row, read back off zod here rather than
    // pasted, and the one `zodToValidationError` copies verbatim —
    // so the leg proves the search would find the leak the
    // vocabulary exists to close, in the form it would arrive in.
    const raised = zodMessagesFor(
      containmentSchema,
      UNDECLARED_SENTINEL_BODY,
    );

    expect(raised.length).toBe(1);
    expect(raised.filter((message) => sentinelHits(message) > 0))
      .toEqual(raised);

    const planted = plantedEnvelope(raised.map((message) => ({
      field: 'body',
      message,
      code: 'unrecognized_keys',
    })));

    expect(sentinelHits(planted)).toBe(raised.length);
  });

  it('is found in the envelope message, which is not a detail', () => {
    // `details` is not the only member a caller reads, and a search
    // narrowed to it would pass every case above and fail here.
    expect(sentinelHits(plantedEnvelope([], SENTINEL))).toBe(1);
  });

  it('is counted at every occurrence rather than the first', () => {
    // The at-once row expects zero out of four sites, so the search
    // has to keep counting rather than stop at the first match. A
    // reading that answered a boolean would report the same thing
    // for one leak and for four.
    const planted = plantedEnvelope(
      CONTAINMENT_SITES.map((site) => ({
        field: SENTINEL,
        message: `Refused ${site}.`,
        code: 'custom',
      })),
    );

    expect(sentinelHits(planted)).toBe(CONTAINMENT_SITES.length);
  });
});
