/**
 * @packageDocumentation
 * The two app-wide HTTP settings this service hands `createService`:
 * which cross-origin callers a browser may let read a response, and
 * how many requests one client may make in a minute.
 *
 * The framework already takes both. `lib/express/schema.ts` declares
 * the `cors` and `rateLimit` members and `lib/express/middleware.ts`
 * applies them, answering `origin: false` with no `cors` block and a
 * 100-per-minute limiter with no `rateLimit` one. What is here is the
 * translation from two environment entries into those members, and
 * the refusals that keep a bad value from reaching them.
 *
 * The refusals live beside the builder rather than in
 * `src/config.ts` because that module parses `process.env` at import,
 * so a suite cannot import it to try a value. `src/config.ts` declares
 * both entries through the two schemas exported here, which makes a
 * refusal this module's test measures the same refusal a boot makes.
 *
 * Nothing here reads the environment and nothing here starts
 * anything: {@link serviceHttpOptions} is a function of the parsed
 * values it is handed.
 */

import type { ServiceConfig } from '../../lib/express/index.js';

import { z } from 'zod';

/**
 * The limiter window, in milliseconds. Fixed rather than configurable,
 * so `AR_RATE_LIMIT_MAX` always reads as a count per minute — the
 * same minute the framework fallback counts 100 in.
 */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Whether one list entry is a bare `http` or `https` origin: a scheme,
 * a host and an optional port, with no path, query, fragment,
 * credentials or trailing slash.
 *
 * Held against the serialisation `URL` gives the entry back, because
 * the `cors` package compares a request's `Origin` header against the
 * list by string equality. An entry the browser would never send —
 * `https://app.example/`, `HTTPS://app.example` — is not a looser
 * spelling of an allowed origin but a line that matches nobody, so it
 * is refused rather than normalised into one that does.
 */
function isBareHttpOrigin(entry: string): boolean {
  if (!URL.canParse(entry)) {
    return false;
  }

  const url = new URL(entry);

  return (url.protocol === 'http:' || url.protocol === 'https:')
    && url.origin === entry;
}

/**
 * `AR_CORS_ORIGINS`: a comma-separated list of origins, parsed into
 * the array the framework's `cors.origins` member takes.
 *
 * Each entry is trimmed, so `a, b` reads as two origins. Every other
 * irregularity is a boot failure, and the message names the entry by
 * its position:
 * - a blank entry, which is how a present-but-blank value, a doubled
 *   comma and a trailing comma all arrive — none of them is a way of
 *   saying nothing is allowed, which is what leaving the entry unset
 *   already says;
 * - `*`, which the framework would hand the `cors` package as a
 *   literal string matching no origin, and which as a wildcard would
 *   open a bearer-guarded API to every page on the web;
 * - anything {@link isBareHttpOrigin} refuses.
 */
export const corsOriginsSchema = z.string().transform((value, ctx) => {
  const entries = value.split(',').map((entry) => entry.trim());

  entries.forEach((entry, index) => {
    const position = `AR_CORS_ORIGINS entry ${index + 1}`;

    if (entry === '') {
      ctx.addIssue({ code: 'custom', message: `${position} is blank` });
    } else if (entry === '*') {
      ctx.addIssue({
        code: 'custom',
        message: `${position} is a wildcard; list each origin instead`,
      });
    } else if (!isBareHttpOrigin(entry)) {
      ctx.addIssue({
        code: 'custom',
        message: `${position} is not a bare http(s) origin`,
      });
    }
  });

  return entries;
});

/**
 * `AR_RATE_LIMIT_MAX`: requests one client may make per
 * {@link RATE_LIMIT_WINDOW_MS}. A positive integer; a blank value
 * coerces to 0 and is refused with the rest.
 */
export const rateLimitMaxSchema = z.coerce.number().int()
  .positive();

/**
 * The parsed entries {@link serviceHttpOptions} reads, each absent when
 * unset. A `type` alias so `Config` from `src/config.ts` is assignable
 * to it without naming every other entry.
 */
export type ServiceHttpEnv = {
  readonly AR_CORS_ORIGINS?: readonly string[];
  readonly AR_RATE_LIMIT_MAX?: number;
};

/**
 * The `cors` and `rateLimit` members to spread into `createService`.
 *
 * A member is omitted, never set to `undefined` or to a default, when
 * its entry is unset. That leaves the framework's own answer standing
 * — no cross-origin reads, and its 100-per-minute fallback — rather
 * than a restatement of it here that the two could drift apart from.
 *
 * @param env - The parsed entries; see {@link ServiceHttpEnv}.
 * @returns An object carrying zero, one or both members.
 */
export function serviceHttpOptions(
  env: ServiceHttpEnv,
): Pick<ServiceConfig, 'cors' | 'rateLimit'> {
  return {
    ...(env.AR_CORS_ORIGINS === undefined
      ? {}
      : { cors: { origins: [...env.AR_CORS_ORIGINS] } }),
    ...(env.AR_RATE_LIMIT_MAX === undefined
      ? {}
      : {
        rateLimit: {
          max: env.AR_RATE_LIMIT_MAX,
          windowMs: RATE_LIMIT_WINDOW_MS,
        },
      }),
  };
}
