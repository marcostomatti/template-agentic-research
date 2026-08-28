import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as version from './version';

describe('readServiceVersion', () => {
  beforeEach(() => {
    // Reset the module-level cache before each test.
    version._resetVersionCache();
  });

  afterEach(() => {
    // Restore the real reader after each test.
    version._resetVersionCache();
  });

  it('returns the version from package.json', () => {
    version._impl.readFile = () => '{"name":"my-service","version":"1.2.3"}';
    expect(version.readServiceVersion()).toBe('1.2.3');
  });

  it('caches the result so the reader is only called once', () => {
    const readFn = vi.fn().mockReturnValue('{"version":"2.0.0"}');
    version._impl.readFile = readFn;
    version.readServiceVersion();
    version.readServiceVersion();
    expect(readFn).toHaveBeenCalledTimes(1);
  });

  it('returns "unknown" when the file does not exist', () => {
    version._impl.readFile = () => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    };
    expect(version.readServiceVersion()).toBe('unknown');
  });

  it('returns "unknown" when the file contains malformed JSON', () => {
    version._impl.readFile = () => 'not valid json {{{';
    expect(version.readServiceVersion()).toBe('unknown');
  });

  it('returns "unknown" when the version field is absent', () => {
    version._impl.readFile = () => '{"name":"my-service"}';
    expect(version.readServiceVersion()).toBe('unknown');
  });

  it('returns an explicit version without reading any file', () => {
    const readFn = vi.fn().mockReturnValue('{"version":"2.0.0"}');
    version._impl.readFile = readFn;
    expect(version.readServiceVersion('9.9.9')).toBe('9.9.9');
    // The short-circuit is the point: a bundled deployment has no
    // package.json above the module, so the read must not be attempted.
    expect(readFn).not.toHaveBeenCalled();
  });

  it('treats an empty explicit version as supplied, not as absent', () => {
    // The guard is `explicit !== undefined` rather than a truthiness
    // check, and this is the only case that tells those two apart: an
    // empty string is a caller-supplied version and is reported as-is.
    version._impl.readFile = () => '{"version":"2.0.0"}';
    expect(version.readServiceVersion('')).toBe('');
  });

  it('does not cache an explicit version', () => {
    // A caller passing a version must not change what a later call
    // omitting one resolves to, so the short-circuit leaves the cache
    // empty rather than filling it.
    version._impl.readFile = () => '{"version":"2.0.0"}';
    expect(version.readServiceVersion('9.9.9')).toBe('9.9.9');
    expect(version.readServiceVersion()).toBe('2.0.0');
  });

  it('resolves the same path from a foreign working directory', () => {
    // `_impl.readFile` is both the probe and the read, so a reader that
    // always throws records every candidate the walk considered — and an
    // identical candidate chain means an identical resolution. Capturing
    // it from two working directories is what makes the claim testable:
    // the resolution this replaced joined `process.cwd()` with
    // 'package.json', so its chain moved with the caller.
    const candidatesFrom = (cwd: string): string[] => {
      const seen: string[] = [];
      const previous = process.cwd();
      version._resetVersionCache();
      version._impl.readFile = (path) => {
        seen.push(path);
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      };
      process.chdir(cwd);
      try {
        version.readServiceVersion();
      } finally {
        process.chdir(previous);
      }
      return seen;
    };

    const packageRoot = process.cwd();
    const elsewhere = tmpdir();
    // Without this the two legs share a cwd and the comparison below
    // compares a run against itself.
    expect(elsewhere).not.toBe(packageRoot);

    const fromPackageRoot = candidatesFrom(packageRoot);
    const fromElsewhere = candidatesFrom(elsewhere);

    expect(fromElsewhere).toEqual(fromPackageRoot);
    // Anchoring the first candidate is what says the chain hangs off the
    // module rather than off whichever directory the two legs shared.
    expect(fromElsewhere[0]).toBe(
      join(dirname(fileURLToPath(import.meta.url)), 'package.json'),
    );
  });
});
