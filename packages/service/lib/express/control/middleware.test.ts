import type { NextFunction, Request, Response } from 'express';

import { describe, expect, it, vi } from 'vitest';

import { controlAuth, controlEnabled } from './middleware';

function makeMocks() {
  const req = {} as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

/**
 * Runs `controlAuth(secret)` over one `x-control-token` header value and
 * returns the mocks the middleware saw, so a case reads as its token
 * fixture plus its assertions.
 */
function callControlAuth(secret: string, token: string) {
  const { req, res, next } = makeMocks();
  (req as Request & { headers: Record<string, string> }).headers = {
    'x-control-token': token,
  };
  controlAuth(secret)(req, res, next);
  return { res, next };
}

// ---------------------------------------------------------------------------
// controlAuth
// ---------------------------------------------------------------------------

describe('controlAuth', () => {
  it('returns 403 when x-control-token header is missing', () => {
    const { req, res, next } = makeMocks();
    (req as Request & { headers: Record<string, string> }).headers = {};
    controlAuth('secret')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when x-control-token header is wrong', () => {
    const { req, res, next } = makeMocks();
    (req as Request & { headers: Record<string, string> }).headers = {
      'x-control-token': 'wrong',
    };
    controlAuth('secret')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when x-control-token header is an array (treated as absent)', () => {
    const { req, res, next } = makeMocks();
    (req as Request & { headers: Record<string, unknown> }).headers = {
      'x-control-token': ['secret', 'secret'],
    };
    controlAuth('secret')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when x-control-token matches', () => {
    const { req, res, next } = makeMocks();
    (req as Request & { headers: Record<string, string> }).headers = {
      'x-control-token': 'secret',
    };
    controlAuth('secret')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // controlAuth reduces both sides to a SHA-256 digest before handing them to
  // timingSafeEqual, which requires equal-length operands and throws a
  // RangeError otherwise. The refusals below are the three ways a supplied
  // token can differ from the secret — shorter, longer, and equal in length
  // but different in content — so a compare over raw tokens would throw on
  // the first two rather than answering 403, and one keyed on a prefix would
  // accept the second. The match is this block's accept guard: without it a
  // middleware that refused everything would leave every case here green. It
  // is a near miss of the equal-length refusal, which carries the same
  // characters in a different order.
  describe('token compare', () => {
    const SECRET = 'control-secret';

    it('returns 403 when the token is shorter than the secret', () => {
      const token = 'control';
      expect(token.length).toBeLessThan(SECRET.length);
      const { res, next } = callControlAuth(SECRET, token);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when the token is longer than the secret', () => {
      const token = 'control-secret-and-then-some';
      expect(token.length).toBeGreaterThan(SECRET.length);
      expect(token.startsWith(SECRET)).toBe(true);
      const { res, next } = callControlAuth(SECRET, token);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when the token matches the secret in length only', () => {
      const token = 'secret-control';
      expect(token).toHaveLength(SECRET.length);
      expect(token).not.toBe(SECRET);
      const { res, next } = callControlAuth(SECRET, token);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() when the token matches the secret exactly', () => {
      const { res, next } = callControlAuth(SECRET, SECRET);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// controlEnabled
// ---------------------------------------------------------------------------

describe('controlEnabled', () => {
  it('returns 404 when enabled is false', () => {
    const { req, res, next } = makeMocks();
    controlEnabled(false)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when enabled is true', () => {
    const { req, res, next } = makeMocks();
    controlEnabled(true)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
