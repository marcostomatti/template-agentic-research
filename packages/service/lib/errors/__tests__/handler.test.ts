import type { Logger } from '../handler.js';

import { describe, expect, it, vi } from 'vitest';
import { z, ZodError, ZodIssueCode } from 'zod';

import { NotFoundError, ValidationError } from '../errors.js';
import { errorHandler, zodToValidationError } from '../handler.js';

function makeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function makeLogger(): Logger {
  return {
    warn: vi.fn(),
    error: vi.fn(),
  };
}

/**
 * Narrows one entry out of a `details` array so a field can be read off it.
 *
 * `ValidationError.details` is optional and `noUncheckedIndexedAccess` makes
 * every index read possibly-undefined, so a bare `details?.[0].field` does
 * not type-check. Throwing here also tells apart two failures that reading
 * `.field` off `undefined` would report identically: details never
 * populated at all, and details populated with fewer entries than the case
 * asked for.
 *
 * Generic over the entry type so it serves both the `FieldError[]` on a
 * `ValidationError` and the cast response bodies further down this file.
 *
 * @param details - The details array under test, possibly absent.
 * @param index - The entry whose field the case is about to read.
 * @returns That entry, typed without the `undefined`.
 * @throws Error When details is absent or holds no entry at `index`.
 */
function detailAt<T>(details: readonly T[] | undefined, index: number): T {
  const detail = details?.[index];

  if (detail === undefined) {
    const found = details === undefined
      ? 'details is undefined'
      : `details has length ${details.length}`;

    throw new Error(`expected a details entry at index ${index}, but ${found}`);
  }

  return detail;
}

// Minimal Express req and next stubs
const req = {} as Parameters<ReturnType<typeof errorHandler>>[1];
const next = vi.fn() as Parameters<ReturnType<typeof errorHandler>>[3];

// Every hand-built `ZodError` in this file — here and in the `errorHandler`
// cases further down — is shaped to zod 4, measured against a real failing
// parse rather than read off the type declarations. A missing nested field
// emits exactly `{ expected, code, path, message }`, and a bound violation
// exactly `{ origin, code, minimum, inclusive, path, message }`.
//
// Two renames land in these fixtures. `received` is gone, and zod 4 puts no
// `input` key on a finalised issue either, so the value that failed survives
// only inside the message text — which is why the missing-field intent now
// rests on the path and the case name. And `too_small`'s `type` is `origin`.
//
// The message strings stay arbitrary sentinels, and `'Required'` — zod 3's
// real text for a missing field — is left in place deliberately rather than
// re-measured: these cases assert only that the string they supply comes back
// out, and rewording them would blur the split with the characterization
// block below, which is where zod's own generated text is pinned.
//
// One fidelity gap the bump opened that no assertion here can see: zod 4's
// `new ZodError([...])` is NOT `instanceof Error`, while the error a real
// `safeParse` hands back is. These fixtures still reach the 422 branch only
// because `errorHandler` tests `instanceof ZodError` before anything else.
describe('zodToValidationError', () => {
  it('maps a nested path to dot-notation field', () => {
    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        path: ['user', 'email'],
        message: 'Required',
      },
    ]);

    const result = zodToValidationError(zodErr);
    expect(result).toBeInstanceOf(ValidationError);
    expect(result.details).toEqual([
      { field: 'user.email', message: 'Required', code: ZodIssueCode.invalid_type },
    ]);
  });

  it('maps a top-level field (single-element path) without a dot', () => {
    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        path: ['name'],
        message: 'Required',
      },
    ]);

    const result = zodToValidationError(zodErr);
    expect(detailAt(result.details, 0).field).toBe('name');
    expect(detailAt(result.details, 0).field).not.toContain('.');
  });

  it('maps multiple issues to multiple FieldErrors', () => {
    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        path: ['a'],
        message: 'Required',
      },
      {
        code: ZodIssueCode.too_small,
        origin: 'string',
        minimum: 1,
        inclusive: true,
        path: ['b', 'c'],
        message: 'Too short',
      },
    ]);

    const result = zodToValidationError(zodErr);
    expect(result.details).toHaveLength(2);
    expect(detailAt(result.details, 0).field).toBe('a');
    expect(detailAt(result.details, 1).field).toBe('b.c');
  });
});

/**
 * Schema whose failing parse is this file's characterization fixture: one
 * nested required field and one numeric lower bound — the two issue shapes
 * this service's request validation actually produces.
 *
 * The cases above hand-build their `ZodIssue` objects. That pins the
 * path-joining in `zodToValidationError`, but it never runs zod's own
 * message generation, so it cannot see a zod release that rewords an
 * issue. `zodToValidationError` copies `issue.message` straight into the
 * 422 body, which makes those words API surface rather than an internal
 * detail — hence a fixture built by a REAL `safeParse`.
 */
const characterizationSchema = z.object({
  user: z.object({
    email: z.string(),
  }),
  age: z.number().min(18),
});

/**
 * Runs the characterization fixture and hands back the error it fails with.
 *
 * Throwing on a successful parse is the vacuity guard: were a future edit to
 * `characterizationSchema` or to the input below to make the parse SUCCEED,
 * the cases would otherwise be asserting over an error zod never produced.
 *
 * @returns The `ZodError` from the fixture's failing `safeParse`.
 * @throws Error When the fixture parses successfully.
 */
function failedFixtureParse(): ZodError {
  const result = characterizationSchema.safeParse({ user: {}, age: 17 });

  if (result.success) {
    throw new Error('the characterization fixture PARSED, so there is no ZodError to characterize');
  }

  return result.error;
}

describe('zodToValidationError (characterization over a real failing parse)', () => {
  it('emits the exact field/code/message triple for each issue', () => {
    const result = zodToValidationError(failedFixtureParse());

    // Measured against zod 3.25.76. The message strings are zod's, copied
    // verbatim into the response body, so a zod upgrade that rewords them
    // turns THIS case red and nothing else in the suite — which is the
    // whole point of the case. Re-measure rather than reword by hand.
    //
    // The array order is asserted deliberately: zod reports issues in
    // schema-declaration order, so a reordering is a real finding about
    // zod's traversal and not a flake to be sorted away.
    expect(result.details).toEqual([
      {
        field: 'user.email',
        code: ZodIssueCode.invalid_type,
        message: 'Required',
      },
      {
        field: 'age',
        code: ZodIssueCode.too_small,
        message: 'Number must be greater than or equal to 18',
      },
    ]);
  });

  it('derives field and code from the issue independently of its message text', () => {
    const zodErr = failedFixtureParse();

    // Deliberately a subset of the triple case above, kept separate because
    // the two halves have different lifetimes: message text is expected to
    // move with a zod major, field and code are not. After a bump, triple
    // red + this green reads as "wording only"; both red says the issue
    // SHAPE changed and the conversion needs more than new strings.
    expect(zodErr.issues).toHaveLength(2);
    const pairs = zodToValidationError(zodErr).details?.map(({ field, code }) => ({ field, code }));
    expect(pairs).toEqual([
      { field: 'user.email', code: ZodIssueCode.invalid_type },
      { field: 'age', code: ZodIssueCode.too_small },
    ]);
  });

  it('copies issue.message verbatim rather than composing its own text', () => {
    const zodErr = failedFixtureParse();

    // `toHaveLength` first, or this goes vacuous: with no issues at all both
    // sides of the comparison below are `[]` and the case passes having
    // compared nothing. This leg is about the MECHANISM, so unlike the
    // triple case it should survive a zod major untouched.
    expect(zodErr.issues).toHaveLength(2);
    const emitted = zodToValidationError(zodErr).details?.map((detail) => detail.message);
    expect(emitted).toEqual(zodErr.issues.map((issue) => issue.message));
  });
});

describe('errorHandler', () => {
  it('responds 500 with INTERNAL_ERROR for unknown errors; calls logger.error', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);
    const res = makeRes();
    const err = new Error('something broke');

    handler(err, req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('responds with AppError statusCode and code; calls logger.warn', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);
    const res = makeRes();
    const err = new NotFoundError('Agent not found');

    handler(err, req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NOT_FOUND', message: 'Agent not found' }),
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('responds 422 VALIDATION_ERROR for ZodError with nested path', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);
    const res = makeRes();

    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        path: ['user', 'email'],
        message: 'Required',
      },
    ]);

    handler(zodErr, req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(422);

    const body = (res.json.mock.calls[0] as [{ code: string; details: Array<{ field: string }> }])[0];
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(detailAt(body.details, 0).field).toBe('user.email');
  });

  it('calls logger.warn (not error) for ZodError', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);
    const res = makeRes();

    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        path: ['x'],
        message: 'Required',
      },
    ]);

    handler(zodErr, req, res as never, next);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs errorName and code for an unknown typed error so it is alertable by field', () => {
    const logged: Array<{ obj: object; msg: string }> = [];
    const logger = {
      warn: (): void => {},
      error: (obj: object, msg: string): void => { logged.push({ obj, msg }); },
    };

    class TypedFailure extends Error {
      readonly code = 'SOME_TYPED_FAILURE';
      constructor() {
        super('typed failure');
        this.name = 'TypedFailure';
      }
    }

    const res = makeRes();
    errorHandler(logger)(new TypedFailure(), req, res as never, next);

    expect(logged).toHaveLength(1);
    // `errorName`, not `name` — `name` on this same log stream already means
    // "service id" (see packages/service/express's pino({ name: serviceId })).
    expect(logged[0]?.obj).toMatchObject({ errorName: 'TypedFailure', code: 'SOME_TYPED_FAILURE' });
    // The response stays generic — the code must NOT reach the client.
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  });

  it('logs reason alongside code when the thrown error carries one', () => {
    const logged: Array<{ obj: object; msg: string }> = [];
    const logger = {
      warn: (): void => {},
      error: (obj: object, msg: string): void => { logged.push({ obj, msg }); },
    };

    class TypedFailureWithReason extends Error {
      readonly code = 'SOME_TYPED_FAILURE';
      readonly reason = 'some_reason';
      constructor() {
        super('typed failure');
        this.name = 'TypedFailureWithReason';
      }
    }

    const res = makeRes();
    errorHandler(logger)(new TypedFailureWithReason(), req, res as never, next);

    expect(logged[0]?.obj).toMatchObject({
      errorName: 'TypedFailureWithReason',
      code: 'SOME_TYPED_FAILURE',
      reason: 'some_reason',
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  });

  it('still responds 500 with the generic body when a field is a throwing getter', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);
    const res = makeRes();

    class HostileFailure extends Error {
      constructor() {
        super('hostile');
        this.name = 'HostileFailure';
      }

      get code(): string {
        throw new Error('boom: code getter threw');
      }
    }

    // The error handler itself must never be the thing that fails to respond.
    expect(() => handler(new HostileFailure(), req, res as never, next)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  });

  it('still responds with the typed AppError body when logger.warn throws', () => {
    // The same guarantee as the unknown-error branch's "throwing getter" test
    // above, but for the AppError branch: a hostile/throwing logger must not
    // cost the caller their typed status and body.
    const logger: Logger = {
      warn: () => { throw new Error('boom: warn threw'); },
      error: vi.fn(),
    };
    const handler = errorHandler(logger);
    const res = makeRes();
    const err = new NotFoundError('Agent not found');

    expect(() => handler(err, req, res as never, next)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NOT_FOUND', message: 'Agent not found' }),
    );
  });

  it('still responds with the 422 VALIDATION_ERROR body when logger.warn throws', () => {
    const logger: Logger = {
      warn: () => { throw new Error('boom: warn threw'); },
      error: vi.fn(),
    };
    const handler = errorHandler(logger);
    const res = makeRes();

    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        path: ['user', 'email'],
        message: 'Required',
      },
    ]);

    expect(() => handler(zodErr, req, res as never, next)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(422);
    const body = (res.json.mock.calls[0] as [{ code: string; details: Array<{ field: string }> }])[0];
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(detailAt(body.details, 0).field).toBe('user.email');
  });

  it('always responds via res.json (Content-Type: application/json implied)', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);

    for (const err of [
      new Error('unknown'),
      new NotFoundError(),
      new ZodError([
        {
          code: ZodIssueCode.invalid_type,
          expected: 'string',
          path: ['f'],
          message: 'Required',
        },
      ]),
    ]) {
      const res = makeRes();
      handler(err, req, res as never, next);
      expect(res.json).toHaveBeenCalledTimes(1);
    }
  });
});
