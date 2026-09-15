import { describe, expect, it } from 'vitest';

import {
  ApiError,
  BAD_ENVELOPE,
  codeForStatus,
  decodeData,
  decodeFailure,
  decodePage,
  HTTP_ERROR,
  RATE_LIMITED,
  UNAUTHORIZED,
} from './envelope';

// Each refusal runs before the case that accepts: a decoder that accepted
// everything would pass every accepting case, so the refusals are what
// prove the checks exist, and the accepting case after them is the control
// proving the same decoder answers at all. Every refused fixture differs
// from its accepted one by the single fault the test names.

const META = { page: 2, perPage: 200, total: 401, totalPages: 3 };

/** Capture what `run` throws, failing the test when it throws nothing. */
function thrown(run: () => unknown): ApiError {
  try {
    run();
  } catch (error) {
    if (error instanceof ApiError) {
      return error;
    }

    throw error;
  }

  throw new Error('expected the decoder to throw');
}

describe('ApiError', () => {
  it('carries status, code, message and details as given', () => {
    // Act
    const error = new ApiError({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Invalid body',
      details: [{ path: 'name' }],
    });

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid body');
    expect(error.details).toEqual([{ path: 'name' }]);
  });
});

describe('decodeData — refusals', () => {
  it.each([
    ['a body that is not JSON', '<html>ok</html>'],
    ['an empty body', ''],
    ['a bare array', '[1,2]'],
    ['a bare resource with no envelope', '{"id":"d1"}'],
    ['success missing', '{"data":{"id":"d1"}}'],
    ['success false', '{"success":false,"data":{"id":"d1"}}'],
    ['success as the string "true"', '{"success":"true","data":{}}'],
    ['data missing', '{"success":true}'],
    ['JSON null', 'null'],
  ])('refuses %s as BAD_ENVELOPE', (_, text) => {
    // Act
    const error = thrown(() => decodeData(200, text));

    // Assert
    expect(error.code).toBe(BAD_ENVELOPE);
    expect(error.status).toBe(200);
  });
});

describe('decodeData — accepts', () => {
  it('unwraps { success: true, data } to data', () => {
    // Act
    const data = decodeData<{ id: string }>(
      200,
      '{"success":true,"data":{"id":"d1"}}',
    );

    // Assert
    expect(data).toEqual({ id: 'd1' });
  });

  it('unwraps a null data, since present-but-null is still an envelope', () => {
    // Act
    const data = decodeData(200, '{"success":true,"data":null}');

    // Assert
    expect(data).toBeNull();
  });
});

describe('decodePage — refusals', () => {
  const page = (body: unknown) => JSON.stringify(body);

  it.each([
    ['a body that is not JSON', 'not json'],
    ['success missing', page({ data: [], meta: META })],
    ['data that is not an array', page({ success: true, data: {}, meta: META })],
    ['meta missing', page({ success: true, data: [] })],
    ['meta that is not an object', page({ success: true, data: [], meta: 3 })],
    [
      'meta.totalPages missing',
      page({ success: true, data: [], meta: { ...META, totalPages: undefined } }),
    ],
    [
      'meta.page below 1',
      page({ success: true, data: [], meta: { ...META, page: 0 } }),
    ],
    [
      'meta.perPage as a string',
      page({ success: true, data: [], meta: { ...META, perPage: '200' } }),
    ],
    [
      'meta.total negative',
      page({ success: true, data: [], meta: { ...META, total: -1 } }),
    ],
    [
      'meta.totalPages fractional',
      page({ success: true, data: [], meta: { ...META, totalPages: 2.5 } }),
    ],
  ])('refuses %s as BAD_ENVELOPE', (_, text) => {
    // Act
    const error = thrown(() => decodePage(200, text));

    // Assert
    expect(error.code).toBe(BAD_ENVELOPE);
  });
});

describe('decodePage — accepts', () => {
  it('unwraps a paginated body to { rows, meta }', () => {
    // Arrange
    const text = JSON.stringify({
      success: true,
      data: [{ id: 'a' }, { id: 'b' }],
      meta: META,
    });

    // Act
    const decoded = decodePage<{ id: string }>(200, text);

    // Assert
    expect(decoded).toEqual({ rows: [{ id: 'a' }, { id: 'b' }], meta: META });
  });

  it('accepts an empty collection, whose totalPages is 0', () => {
    // Arrange
    const meta = { page: 1, perPage: 200, total: 0, totalPages: 0 };

    // Act
    const decoded = decodePage(200, JSON.stringify({
      success: true,
      data: [],
      meta,
    }));

    // Assert
    expect(decoded).toEqual({ rows: [], meta });
  });

  it('keeps only the four meta members', () => {
    // Act
    const decoded = decodePage(200, JSON.stringify({
      success: true,
      data: [],
      meta: { ...META, extra: true },
    }));

    // Assert
    expect(decoded.meta).toEqual(META);
  });
});

describe('codeForStatus', () => {
  it.each([
    [400, 'BAD_REQUEST'],
    [401, UNAUTHORIZED],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'VALIDATION_ERROR'],
    [429, RATE_LIMITED],
    [500, 'INTERNAL_ERROR'],
    [503, 'INTERNAL_ERROR'],
    [418, HTTP_ERROR],
  ])('maps %i to %s', (status, code) => {
    // Act + Assert
    expect(codeForStatus(status)).toBe(code);
  });
});

describe('decodeFailure — bodies in neither shape fall back to the status', () => {
  it.each([
    ['an unmatched path', 404, '<!DOCTYPE html><pre>Cannot GET /nope</pre>'],
    ['the app-wide limiter', 429, 'Too many requests, please try again later.'],
    ['an empty body', 502, ''],
    ['JSON with neither shape', 409, '{"reason":"taken"}'],
    ['a code with no message', 422, '{"code":"VALIDATION_ERROR"}'],
    ['a non-string error', 401, '{"error":true}'],
    ['a JSON array', 400, '[]'],
  ])('derives the code for %s', (_, status, text) => {
    // Act
    const error = decodeFailure(status, text);

    // Assert
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(status);
    expect(error.code).toBe(codeForStatus(status));
    expect(error.details).toBeUndefined();
  });

  it('keeps a bare error sentence it has no code for', () => {
    // Act
    const error = decodeFailure(400, '{"error":"Bad Request"}');

    // Assert
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Bad Request');
  });
});

describe('decodeFailure — bare { error } bodies', () => {
  it('does not read an unrecognised sentence as UNAUTHORIZED', () => {
    // Act — a 403 whose bare sentence merely resembles the guard's
    const error = decodeFailure(403, '{"error":"unauthorized"}');

    // Assert
    expect(error.code).toBe('FORBIDDEN');
  });

  it('maps requireAuth\'s { error: "Unauthorized" } to UNAUTHORIZED', () => {
    // Act
    const error = decodeFailure(401, '{"error":"Unauthorized"}');

    // Assert
    expect(error.code).toBe(UNAUTHORIZED);
    expect(error.status).toBe(401);
    expect(error.message).toBe('Unauthorized');
  });

  it('maps the login limiter\'s { error: "Too Many Requests" } to RATE_LIMITED', () => {
    // Act
    const error = decodeFailure(429, '{"error":"Too Many Requests"}');

    // Assert
    expect(error.code).toBe(RATE_LIMITED);
    expect(error.status).toBe(429);
    expect(error.message).toBe('Too Many Requests');
  });
});

describe('decodeFailure — the framework\'s { code, message, details? }', () => {
  it('omits details when the body carried none', () => {
    // Act
    const error = decodeFailure(
      404,
      '{"code":"NOT_FOUND","message":"Domain not found"}',
    );

    // Assert
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Domain not found');
    expect(error.details).toBeUndefined();
  });

  it('takes code, message and details as given, over the status', () => {
    // Arrange — a code the status would not derive, to prove the body wins
    const details = [{ path: ['query', 'perPage'], message: 'Too big' }];
    const text = JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: 'Invalid query',
      details,
    });

    // Act
    const error = decodeFailure(400, text);

    // Assert
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid query');
    expect(error.details).toEqual(details);
  });

  it('reads the 500 on a malformed request body as given', () => {
    // Act
    const error = decodeFailure(
      500,
      '{"code":"INTERNAL_ERROR","message":"An unexpected error occurred"}',
    );

    // Assert
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('An unexpected error occurred');
  });
});
