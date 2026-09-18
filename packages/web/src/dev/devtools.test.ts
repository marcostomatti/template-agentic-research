import type { ProbeAuthCall } from '../data/auth';

import { describe, expect, it } from 'vitest';

import { authMode, probeAuth } from '../data/auth';

import {
  DEVTOOLS_NO_SURFACE,
  devToolsBuildVersion,
  devToolsExtra,
  probeDevToolsApiVersion,
} from './devtools';

/** What a flat context record is allowed to carry. */
const PRIMITIVE_TYPES: readonly string[] = ['string', 'number', 'boolean'];

describe('devToolsExtra', () => {
  it('reports no surface for a path that names none', () => {
    const extra = devToolsExtra('/nowhere', 'fixture');

    expect(extra.surface).toBe(DEVTOOLS_NO_SURFACE);
  });

  it('reports no surface for the single-domain index path', () => {
    const extra = devToolsExtra('/', 'fixture');

    expect(extra.surface).toBe(DEVTOOLS_NO_SURFACE);
  });

  it('answers a record of primitives only, one level deep', () => {
    const extra = devToolsExtra('/d/ai/lexicon/new', 'api');
    const types = Object.values(extra).map((value) => typeof value);

    expect(types.length).toBeGreaterThan(0);
    expect(types.every((type) => PRIMITIVE_TYPES.includes(type))).toBe(true);
  });

  it('carries the path it was handed as the route', () => {
    const extra = devToolsExtra('/digest', 'fixture');

    expect(extra.route).toBe('/digest');
  });

  it('keeps a modal sub-route on the surface that owns it', () => {
    const extra = devToolsExtra('/lexicon/new', 'fixture');

    expect(extra.surface).toBe('lexicon');
  });

  it('reads the surface out of a domain-based path', () => {
    const extra = devToolsExtra('/d/ai/sources', 'fixture');

    expect(extra.surface).toBe('sources');
  });

  it('carries the data source it was handed', () => {
    expect(devToolsExtra('/digest', 'api').dataSource).toBe('api');
    expect(devToolsExtra('/digest', 'fixture').dataSource).toBe('fixture');
  });
});

describe('probeDevToolsApiVersion', () => {
  it('answers null for a probe that rejects, rather than rejecting', async () => {
    const rejecting: ProbeAuthCall = () => Promise.reject(new Error('offline'));

    await expect(probeDevToolsApiVersion(rejecting)).resolves.toBeNull();
  });

  it('answers null when there is no probe to call', async () => {
    await expect(probeDevToolsApiVersion(undefined)).resolves.toBeNull();
  });

  it('answers null for the probe a fixture build actually holds', async () => {
    // The control: this runner has no VITE_AR_API_URL, so the selector
    // above must BE the fixture one. Without it a wired probe that
    // merely failed would read the same as no probe at all.
    expect(authMode).toBe('fixture');
    expect(probeAuth).toBeUndefined();

    await expect(probeDevToolsApiVersion(probeAuth)).resolves.toBeNull();
  });

  it('answers what a reachable service said about its auth', async () => {
    const open: ProbeAuthCall = () => Promise.resolve('open');

    await expect(probeDevToolsApiVersion(open)).resolves.toBe('open');
  });
});

describe('devToolsBuildVersion', () => {
  it('leaves every member undefined where define did not reach', () => {
    // The unit runner is a build the plugin never transformed, which is
    // the shape a production build has too: the three identifiers are
    // not declared at all, so a read that was not a `typeof` guard
    // would throw here rather than answer.
    expect(devToolsBuildVersion()).toEqual({
      commit: undefined,
      branch: undefined,
      round: undefined,
    });
  });
});
