import * as fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedVersion: string | undefined;

/** @internal Mutable impl object so tests can replace readFile without module mocking. */
export const _impl = {
  readFile: (path: string, enc: string) => fs.readFileSync(path, enc as Parameters<typeof fs.readFileSync>[1]) as string,
};

/** @internal Resets the module-level cache and restores the real reader. Used only in tests. */
export function _resetVersionCache(): void {
  cachedVersion = undefined;
  _impl.readFile = (path, enc) => fs.readFileSync(path, enc as Parameters<typeof fs.readFileSync>[1]) as string;
}

/**
 * Reads the nearest `package.json` at or above this module's own directory.
 *
 * The walk starts at `dirname(fileURLToPath(import.meta.url))` and not at
 * `process.cwd()`, which is what this used to join against. The working
 * directory belongs to whoever launched the process, so a service started
 * from a parent directory read that directory's `package.json` — or none —
 * and reported someone else's version, or `'unknown'`, with no error to
 * show for it. The module's own path says where the service actually lives
 * and does not move with the caller.
 *
 * `_impl.readFile` is both the probe and the read, so the entire walk goes
 * through the single seam the tests replace and no second, unstubbed
 * filesystem call creeps in. A candidate that throws is treated as absent
 * and the walk steps up, which makes the first READABLE `package.json` the
 * match: a malformed one is still a match, and its parse failure surfaces
 * as `'unknown'` rather than being skipped in favour of an ancestor's.
 *
 * @returns The raw file contents, or `undefined` when the walk reaches the
 *   filesystem root without a readable `package.json`.
 */
function readNearestPackageJson(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));

  while (true) {
    try {
      return _impl.readFile(join(dir, 'package.json'), 'utf-8');
    } catch {
      // `dirname` is a fixed point at the filesystem root, so comparing a
      // directory against its own parent is what terminates the walk.
      const parent = dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }
}

/**
 * Returns the service version the control plane reports.
 *
 * When `explicit` is supplied it is returned as-is and no file is read —
 * the escape hatch for a bundled deployment, where the module is inlined
 * into an artifact with no `package.json` above it and the walk would
 * otherwise find nothing. It deliberately does not populate the cache, so
 * a caller passing a version cannot change what a later call omitting one
 * resolves to.
 *
 * Otherwise the `version` field comes from the nearest `package.json` at
 * or above this module's directory (see {@link readNearestPackageJson}),
 * cached after the first read so the file is not re-read on subsequent
 * calls. Returns `'unknown'` when no such file can be read, or when the
 * `version` field is absent or not a string.
 *
 * @param explicit - Version to report instead of reading `package.json`.
 * @returns The resolved version string, or `'unknown'`.
 */
export function readServiceVersion(explicit?: string): string {
  if (explicit !== undefined) return explicit;
  if (cachedVersion !== undefined) return cachedVersion;

  const raw = readNearestPackageJson();
  if (raw === undefined) {
    cachedVersion = 'unknown';
    return cachedVersion;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const version =
      parsed !== null &&
      typeof parsed === 'object' &&
      'version' in parsed &&
      typeof (parsed as Record<string, unknown>)['version'] === 'string'
        ? (parsed as Record<string, string>)['version']
        : undefined;
    cachedVersion = version ?? 'unknown';
  } catch {
    cachedVersion = 'unknown';
  }

  return cachedVersion;
}
