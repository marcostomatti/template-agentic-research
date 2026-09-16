/**
 * `corsOriginsSchema`, `rateLimitMaxSchema` and `serviceHttpOptions` —
 * the two app-wide HTTP settings, from the environment string a boot
 * reads to the members `createService` is handed.
 *
 * The refusals run first. `src/config.ts` declares both entries
 * through these two schemas, so a value refused here is a value that
 * fails a boot, and the order puts the claim a deployment most needs
 * — that a blank list or a wildcard never quietly opens the service —
 * ahead of the readings that assume a value got through.
 *
 * Each refusal table sits beside an accepted one over the same schema,
 * and the two are each other's control: a block of refusals alone is
 * green against a schema refusing everything, and a block of accepts
 * alone against one refusing nothing. The two boundary pairs are held
 * the same way — 0 beside 1, and a trailing slash beside the bare
 * origin it decorates.
 *
 * What a limiter or a CORS middleware then DOES with these members is
 * not read here: that needs a booted service, and belongs to a suite
 * that boots one through `createService`.
 */

import { describe, expect, it } from 'vitest';

import {
  corsOriginsSchema,
  RATE_LIMIT_WINDOW_MS,
  rateLimitMaxSchema,
  serviceHttpOptions,
} from './service-options.js';

/** Every issue message a refused parse raised, in order. */
function refusalMessages(
  result: { success: boolean; error?: { issues: { message: string }[] } },
): readonly string[] {
  return result.error?.issues.map((issue) => issue.message) ?? [];
}

describe('corsOriginsSchema — refusals', () => {
  const refused: readonly [label: string, value: string, message: string][] = [
    ['a blank value', '', 'AR_CORS_ORIGINS entry 1 is blank'],
    ['a whitespace value', '   ', 'AR_CORS_ORIGINS entry 1 is blank'],
    ['a doubled comma', 'http://a.test,,http://b.test', 'AR_CORS_ORIGINS entry 2 is blank'],
    ['a trailing comma', 'http://a.test,', 'AR_CORS_ORIGINS entry 2 is blank'],
    ['a wildcard', '*', 'AR_CORS_ORIGINS entry 1 is a wildcard; list each origin instead'],
    ['a wildcard beside an origin', 'http://a.test,*', 'AR_CORS_ORIGINS entry 2 is a wildcard; list each origin instead'],
    ['a bare host', 'a.test', 'AR_CORS_ORIGINS entry 1 is not a bare http(s) origin'],
    ['a non-http scheme', 'ftp://a.test', 'AR_CORS_ORIGINS entry 1 is not a bare http(s) origin'],
    ['a trailing slash', 'https://a.test/', 'AR_CORS_ORIGINS entry 1 is not a bare http(s) origin'],
    ['a path', 'https://a.test/app', 'AR_CORS_ORIGINS entry 1 is not a bare http(s) origin'],
    ['an upper-case scheme', 'HTTPS://a.test', 'AR_CORS_ORIGINS entry 1 is not a bare http(s) origin'],
    ['credentials', 'https://u:p@a.test', 'AR_CORS_ORIGINS entry 1 is not a bare http(s) origin'],
    ['the null origin', 'null', 'AR_CORS_ORIGINS entry 1 is not a bare http(s) origin'],
  ];

  it.each(refused)('refuses %s', (_label, value, message) => {
    const result = corsOriginsSchema.safeParse(value);

    expect(result.success).toBe(false);
    expect(refusalMessages(result)).toEqual([message]);
  });

  it('names every bad entry, not only the first', () => {
    const result = corsOriginsSchema.safeParse(',*,http://a.test,a.test');

    expect(refusalMessages(result)).toEqual([
      'AR_CORS_ORIGINS entry 1 is blank',
      'AR_CORS_ORIGINS entry 2 is a wildcard; list each origin instead',
      'AR_CORS_ORIGINS entry 4 is not a bare http(s) origin',
    ]);
  });

  it('never echoes the refused value', () => {
    const value = 'https://secret-host.test/private-path';
    const result = corsOriginsSchema.safeParse(value);

    expect(refusalMessages(result).join('\n')).not.toContain('secret-host');
  });
});

describe('rateLimitMaxSchema — refusals', () => {
  const refused: readonly [label: string, value: string][] = [
    ['a blank value', ''],
    ['zero', '0'],
    ['a negative count', '-5'],
    ['a fraction', '1.5'],
    ['a word', 'many'],
  ];

  it.each(refused)('refuses %s', (_label, value) => {
    expect(rateLimitMaxSchema.safeParse(value).success).toBe(false);
  });
});

describe('corsOriginsSchema — accepts', () => {
  const accepted: readonly [label: string, value: string, parsed: string[]][] = [
    ['one https origin', 'https://a.test', ['https://a.test']],
    ['an http origin with a port', 'http://localhost:5173', ['http://localhost:5173']],
    ['two origins', 'https://a.test,http://b.test:8080', ['https://a.test', 'http://b.test:8080']],
    ['spaces around entries', ' https://a.test , http://b.test ', ['https://a.test', 'http://b.test']],
  ];

  it.each(accepted)('accepts %s', (_label, value, parsed) => {
    const result = corsOriginsSchema.safeParse(value);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(parsed);
  });
});

describe('rateLimitMaxSchema — accepts', () => {
  it.each([
    ['1', 1],
    ['100', 100],
    ['1000', 1000],
  ] as const)('accepts %s', (value, parsed) => {
    expect(rateLimitMaxSchema.safeParse(value)).toEqual({
      success: true,
      data: parsed,
    });
  });
});

describe('serviceHttpOptions', () => {
  it('answers neither member when nothing is set', () => {
    const options = serviceHttpOptions({});

    expect(options).toEqual({});
    expect(Object.keys(options)).toEqual([]);
  });

  it('answers only cors when only the origins are set', () => {
    const options = serviceHttpOptions({
      AR_CORS_ORIGINS: ['https://a.test'],
    });

    expect(options).toEqual({ cors: { origins: ['https://a.test'] } });
    expect(Object.keys(options)).toEqual(['cors']);
  });

  it('answers only rateLimit, at a one-minute window, when only the max is set', () => {
    const options = serviceHttpOptions({ AR_RATE_LIMIT_MAX: 1000 });

    expect(options).toEqual({ rateLimit: { max: 1000, windowMs: 60_000 } });
    expect(RATE_LIMIT_WINDOW_MS).toBe(60_000);
  });

  it('answers both members when both are set', () => {
    expect(serviceHttpOptions({
      AR_CORS_ORIGINS: ['https://a.test', 'http://b.test'],
      AR_RATE_LIMIT_MAX: 5,
    })).toEqual({
      cors: { origins: ['https://a.test', 'http://b.test'] },
      rateLimit: { max: 5, windowMs: 60_000 },
    });
  });

  it('hands createService a copy of the origins rather than the parsed list', () => {
    const origins = ['https://a.test'];
    const options = serviceHttpOptions({ AR_CORS_ORIGINS: origins });

    expect(options.cors?.origins).toEqual(origins);
    expect(options.cors?.origins).not.toBe(origins);
  });

  it('reads the parsed schemas end to end', () => {
    const env = {
      AR_CORS_ORIGINS: corsOriginsSchema.parse('http://localhost:5173'),
      AR_RATE_LIMIT_MAX: rateLimitMaxSchema.parse('250'),
    };

    expect(serviceHttpOptions(env)).toEqual({
      cors: { origins: ['http://localhost:5173'] },
      rateLimit: { max: 250, windowMs: 60_000 },
    });
  });
});
