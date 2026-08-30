/**
 * @packageDocumentation
 * The boundary parser. Every wave-1 route reads its body through
 * {@link parseBody} and its query through {@link parseQuery}, and
 * those two functions are the only place in this package where a
 * failed parse becomes a refusal.
 *
 * Both return parsed data or THROW. A route handler carries no
 * try/catch and calls no `next(err)`: `createService` registers
 * `errorHandler` from `lib/errors` LAST, and under Express 5 a bare
 * `throw` inside an `async` handler reaches it, so a refusal here
 * arrives on the wire as a 422 carrying `{ code, message, details }`
 * at no cost to the call site.
 *
 * WHAT A DETAIL IS ALLOWED TO SAY is why this module exists. Each
 * `FieldError` carries a dotted field PATH built from `issue.path`,
 * a message drawn from {@link ISSUE_MESSAGES} — a fixed vocabulary
 * of this repo's own, keyed on the issue code — and that code.
 * Nothing in a detail is copied out of the request: not
 * `issue.message`, not `issue.keys`, and no submitted value.
 *
 * The failure that closes is a default rather than a hypothesis.
 * `zodToValidationError` in `lib/errors/handler.ts` copies
 * `issue.message` VERBATIM, and `errorHandler` answers a raw
 * `ZodError` through it. So a handler that calls `.parse()` and lets
 * the `ZodError` escape, rather than coming through here, quotes the
 * request back to the caller and writes the same string to the warn
 * line — with no code change anywhere and every gate green. Measured
 * under the zod 4.5.1 in this tree: a `.strict()` object rejecting an
 * undeclared key answers `Unrecognized key: "<the submitted key>"`.
 *
 * The vocabulary is keyed on the code rather than on which issue
 * kinds happen to be safe today. `invalid_type` names only the
 * expected TYPE and an enum's `invalid_value` names only the allowed
 * options, both measured in the same run — but a zod minor that
 * rewords a message changes this service's wire text with no diff in
 * this package, which is what the 3-to-4 bump did to `Required`.
 *
 * `docs/architecture/08-http-api.md` carries the wave-1 wire contract
 * and the argument behind it. This module is where the validation
 * half of it is executed.
 */
import type { FieldError } from '../../lib/errors/index.js';
import type { core, output, ZodType } from 'zod';

import { ValidationError } from '../../lib/errors/index.js';

/**
 * The message a detail carries for each kind of issue zod can raise.
 *
 * Every string here is this repo's own. None of them is composed,
 * interpolated or read off the issue, which is what makes the
 * containment claim in this module's header a property of the
 * VOCABULARY rather than of a review of which fields were touched.
 * They are written in the third person about the field the detail
 * names, so `{ field: 'settings.weight', message: 'Below the allowed
 * minimum.' }` reads as one sentence.
 *
 * Keyed exhaustively: the annotation is `Record<core.$ZodIssueCode,
 * string>` over zod's own closed union of eleven codes, so a zod
 * version that adds a twelfth is a red `check-types` here rather
 * than a `message: undefined` reaching the wire. That is the whole
 * guard — there is deliberately no runtime fallback, because a
 * fallback would answer the same bump silently and could never be
 * reached by a test.
 *
 * `invalid_type` covers BOTH a missing required field and a
 * wrong-typed one, and the collapse is zod's rather than a choice
 * made here: measured under 4.5.1, an absent `pattern` and a numeric
 * one both raise `invalid_type` carrying only `expected`, with no
 * `received` and no `input` on the issue at all. Nothing safe
 * separates them, so the message covers both rather than guessing.
 * The two cases still differ in the detail a caller reads, because
 * they differ in the field path.
 */
const ISSUE_MESSAGES: Record<core.$ZodIssueCode, string> = {
  invalid_type: 'Missing, or not of the expected type.',
  too_small: 'Below the allowed minimum.',
  too_big: 'Above the allowed maximum.',
  invalid_format: 'Not in the expected format.',
  not_multiple_of: 'Not an allowed multiple.',
  unrecognized_keys: 'Carries a key this endpoint does not declare.',
  invalid_union: 'Matches none of the accepted shapes.',
  invalid_key: 'Carries a key of the wrong type.',
  invalid_element: 'Contains an element of the wrong type.',
  invalid_value: 'Not one of the accepted values.',
  custom: 'Refused by a rule this endpoint enforces.',
};

/**
 * The `field` a detail names when the issue has no path of its own
 * and the value being parsed was a request BODY.
 *
 * An issue against the root carries an empty `issue.path` (measured:
 * a `.strict()` object refusing an undeclared key, and any value
 * that is not an object at all), and a detail whose `field` is the
 * empty string tells a caller nothing about where to look. So the
 * root is given a name.
 *
 * The name is declared here and nowhere else, and a router never
 * supplies one — which is what makes `body` mean the same thing on
 * every route. {@link QUERY_ROOT_FIELD} is the same decision for the
 * other half of a request, and the pair is the whole reason
 * {@link parseBody} and {@link parseQuery} are two functions rather
 * than one: a caller that reads `field: 'query'` learns that its
 * query string carried the fault, which a shared spelling could not
 * tell it.
 */
const BODY_ROOT_FIELD = 'body';

/**
 * The `field` a detail names for a root-level issue when the value
 * being parsed was a request QUERY.
 *
 * @see {@link BODY_ROOT_FIELD} for why the root needs a name at all
 *   and why there are two of them.
 */
const QUERY_ROOT_FIELD = 'query';

/**
 * What a caller may tell the boundary parser about the value it is
 * parsing.
 *
 * It declares no member today, and is declared anyway so that the
 * signature route code is written against does not change when the
 * first one lands. The sanitiser's `openPaths` — the prefixes below
 * which an operator-chosen key collapses to `*`, argued in
 * `docs/architecture/08-http-api.md` — is what fills it.
 *
 * Spelled as a record of `never` rather than as an empty interface
 * because the two are not the same promise: `{}` admits `0` and `''`
 * as well as every object, while this admits `{}` and refuses any
 * member it has not declared. A caller cannot pass an option that
 * does not exist yet and have it silently ignored.
 */
export type ParseOptions = Readonly<Record<string, never>>;

/**
 * The dotted field path a detail names for one issue.
 *
 * @param path - `issue.path`, as zod built it.
 * @param rootField - The name to use when the path is empty.
 * @returns `rootField` for a root-level issue, and the segments
 *   joined with `.` otherwise — so an object member is `settings`, a
 *   nested one `settings.weight`, and an array entry
 *   `terms.1.pattern`.
 *
 * @remarks
 * Every segment goes through `String` rather than through `join`'s
 * own conversion, which is not a formality: `join` throws a
 * `TypeError` on a symbol segment, and `issue.path` is typed
 * `PropertyKey[]`. `zodToValidationError` in `lib/errors/handler.ts`
 * calls `path.join('.')` bare and would take that throw inside an
 * error handler, where there is nothing left to answer with. A
 * symbol key cannot arrive over JSON, so this is a guard against the
 * shape of the type rather than against a known request.
 */
function toFieldPath(
  path: readonly PropertyKey[],
  rootField: string,
): string {
  if (path.length === 0) {
    return rootField;
  }

  return path.map((segment) => String(segment)).join('.');
}

/**
 * Turns every issue in a failed parse into the detail a caller
 * reads.
 *
 * @param issues - `error.issues`, in the order zod raised them. All
 *   of them: a body with three faults answers three details, so one
 *   round trip tells a caller everything that is wrong with it.
 * @param _options - What the caller asked for. Nothing is read from
 *   it yet; see {@link ParseOptions}.
 * @param rootField - The name a root-level issue's field takes.
 * @returns One {@link FieldError} per issue, carrying the path, the
 *   fixed message for the issue's code, and that code.
 *
 * @remarks
 * `code` is the one member copied off the issue, and it is zod's
 * closed vocabulary rather than anything submitted — which is what
 * makes it the member a client can branch on while `message` stays
 * a string for a person to read.
 *
 * The bag arrives SECOND rather than last, which is deliberate and
 * is the only place in this module the order matters. This is where
 * the sanitiser's options are read, so the parameter is threaded
 * from the public functions today and unread today — and the two
 * unused-symbol gates disagree about exactly that shape. tsconfig's
 * `noUnusedParameters` honours the `_` prefix; ESLint's
 * `no-unused-vars` runs `args: 'after-used'` with no ignore pattern
 * here, so it reports any unread TRAILING parameter whatever it is
 * called. Sitting before `rootField`, which is read, satisfies both
 * without a suppression.
 */
function toFieldErrors(
  issues: readonly core.$ZodIssue[],
  _options: ParseOptions,
  rootField: string,
): FieldError[] {
  return issues.map((issue) => ({
    field: toFieldPath(issue.path, rootField),
    message: ISSUE_MESSAGES[issue.code],
    code: issue.code,
  }));
}

/**
 * Parses one value, or throws the refusal a route answers with.
 *
 * The shared half of {@link parseBody} and {@link parseQuery}, which
 * differ only in the name a root-level issue's field takes. Written
 * once so the two cannot drift into two sanitisers.
 *
 * @param schema - What the value has to satisfy.
 * @param value - The unvalidated value.
 * @param options - What the caller asked for, forwarded whole to
 *   {@link toFieldErrors}.
 * @param rootField - {@link BODY_ROOT_FIELD} or
 *   {@link QUERY_ROOT_FIELD}.
 * @returns The parsed value, with every default applied and every
 *   coercion done — so a caller reads the schema's output type and
 *   never the input it was handed.
 * @throws ValidationError - Carrying one detail per issue. `422`
 *   with `code: 'VALIDATION_ERROR'` once `errorHandler` has answered
 *   it.
 */
function parseOrThrow<S extends ZodType>(
  schema: S,
  value: unknown,
  options: ParseOptions,
  rootField: string,
): output<S> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      toFieldErrors(result.error.issues, options, rootField),
    );
  }

  return result.data;
}

/**
 * Parses a request body.
 *
 * @param schema - What the body has to satisfy. Strict, on this
 *   surface: an undeclared key is refused rather than stripped, and
 *   the sanitiser above is what makes that affordable.
 * @param value - `req.body`. Typed `unknown` on purpose — Express
 *   types it `any`, and a boundary that accepts `any` is not one.
 * @param options - What the sanitiser should be told about this
 *   body. Defaults to none, and declares no member yet — see
 *   {@link ParseOptions}.
 * @returns The parsed body.
 * @throws ValidationError - With a detail per issue, each naming a
 *   field path and none carrying submitted content. A root-level
 *   issue names {@link BODY_ROOT_FIELD}.
 *
 * @example
 * ```ts
 * router.post('/domains', async (req, res) => {
 *   const body = parseBody(createDomainSchema, req.body);
 *   res.status(201).json(ok(await createDomain(store, body)));
 * });
 * ```
 */
export function parseBody<S extends ZodType>(
  schema: S,
  value: unknown,
  options: ParseOptions = {},
): output<S> {
  return parseOrThrow(schema, value, options, BODY_ROOT_FIELD);
}

/**
 * Parses a request query string.
 *
 * @param schema - What the query has to satisfy, normally
 *   `paginationQuerySchema` from `./schemas.ts` or an extension of
 *   it.
 * @param value - `req.query`. Express 5 here runs the `simple` query
 *   parser, so every value arrives as a `string` or a `string[]` and
 *   nothing nests — which is why a query schema coerces rather than
 *   expecting numbers, and why `?page[]=1` is refused as the
 *   undeclared key `page[]`.
 * @param options - What the sanitiser should be told about this
 *   query. Defaults to none, and declares no member yet — see
 *   {@link ParseOptions}.
 * @returns The parsed query, defaults applied.
 * @throws ValidationError - With a detail per issue. A root-level
 *   issue names {@link QUERY_ROOT_FIELD}, so a misspelt parameter is
 *   answered against `query` rather than against the empty string.
 *
 * @example
 * ```ts
 * const query = parseQuery(paginationQuerySchema, req.query);
 * const window = toStoreWindow(query);
 * ```
 */
export function parseQuery<S extends ZodType>(
  schema: S,
  value: unknown,
  options: ParseOptions = {},
): output<S> {
  return parseOrThrow(schema, value, options, QUERY_ROOT_FIELD);
}
