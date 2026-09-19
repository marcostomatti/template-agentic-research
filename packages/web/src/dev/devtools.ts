/**
 * @packageDocumentation
 * The dev-tools wiring: the ONE config `@ar/dev-tools` is mounted
 * with, and the three readings that fill it.
 *
 * `../main.tsx` reaches this module through a dynamic import behind
 * `import.meta.env.DEV`, so nothing here runs in a production build.
 * The widget itself belongs to the package; what this file decides is
 * what the widget is TOLD about this app.
 *
 * ## Why the build facts are read HERE rather than inside the package
 *
 * `devtoolsPlugin()` defines `__DEVTOOLS_COMMIT__`,
 * `__DEVTOOLS_BRANCH__` and `__DEVTOOLS_ROUND__` through Vite's
 * `define`, which rewrites SOURCE the dev server transforms.
 * `@ar/dev-tools` is linked as a built `dist/index.js` and is never
 * transformed, so the same three identifiers read inside the package
 * would stay free identifiers at runtime — the asymmetry that
 * package's `core/types.ts` records beside
 * `DevToolsConfig.version`. This file IS app source, so `define`
 * reaches it, and the three values travel into the package as that
 * member. It is why the About panel can show a real commit rather
 * than `unknown`.
 *
 * ## ... and why each of the three is read behind a `typeof` guard
 *
 * The plugin is `apply: 'serve'`, so under `vite build` its `config()`
 * hook never runs and the three defines do not exist. A plain
 * `__DEVTOOLS_COMMIT__` would then be a `ReferenceError` that took the
 * app's bootstrap with it rather than a missing version line. `typeof`
 * is the one read that is legal against an identifier that was never
 * declared, and it survives the substitution it guards: `define`
 * replaces the operand first, so a dev server leaves
 * `typeof '6a5d0c2' === 'string'` behind.
 *
 * The `declare const` block below is the type-side half of the same
 * asymmetry. It states what the plugin substitutes and emits nothing;
 * `| undefined` is what a build the plugin never ran against actually
 * has, and it keeps the false branch of each guard from narrowing to
 * `never`.
 *
 * ## The API probe is `probeAuth`'s shape, and its answer is honest
 *
 * `../data/auth.ts` hands a build a `probeAuth` that is `undefined`
 * under fixtures and a function against the service otherwise, and
 * {@link probeDevToolsApiVersion} is that selection read once more:
 * `null` when there is no service to ask, and `null` — never a
 * rejection — when the ask failed. Both are what
 * `DevToolsConfig.apiVersion` documents as "unavailable", and the
 * package's own `resolveDevToolsApiVersion` would swallow a rejection
 * anyway; catching here as well is not redundancy but the config
 * member honouring its own contract, which is the only thing a later
 * caller of it can rely on.
 *
 * What the line CARRIES is the reachability reading, because the
 * service exposes no version route yet: `open` or `required`, straight
 * from `probeAuth`. Either one means a service answered. `null` means
 * none did.
 *
 * ## `extra()` is called per read, and stays flat
 *
 * `DevToolsHost.context()` promises primitives one level deep, so a
 * feature can drop the record into a report body with no walk and no
 * serialiser. The route moves while the widget stays mounted — every
 * navigation moves it — which is why the config member is a function
 * rather than a captured object, and why {@link devToolsExtra} takes
 * the path as an ARGUMENT rather than reading `window.location`
 * itself: the DOM read belongs to the caller, and what is left is a
 * pure function the colocated cases can hold flat.
 *
 * The data source is the other half, and unlike the route it does not
 * move: it is a build-time selection, resolved once at module scope. A
 * report filed from a fixture build and one filed against the service
 * are otherwise indistinguishable, and they are not the same bug.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/dev/devtools.test.ts` from `packages/web` against the 12 cases
 * `./devtools.test.ts` holds, and restores this file byte-identical
 * (the harness compared the restored digest to the original, every
 * leg):
 *
 * - Dropping the `catch` from {@link probeDevToolsApiVersion} answers
 *   `Tests  1 failed | 11 passed (12)`: `answers null for a probe that
 *   rejects, rather than rejecting`, as `AssertionError: promise
 *   rejected "Error: offline" instead of resolving`.
 * - Nesting a value inside {@link devToolsExtra}'s record answers `2
 *   failed | 10 passed` — the flatness walk and the route case — which
 *   is what makes that walk a reading rather than a formality: it can
 *   fail, and this is the leg that proves it.
 * - Reporting the surface as `activeSurfaceId(path)` with no fallback
 *   answers `2 failed | 10 passed`: the path that names no surface and
 *   the index path, both `expected undefined to be 'none'`. The
 *   flatness walk does NOT trip on it, measured — the record it reads
 *   is on a path that HAS a surface — so those cases are not one
 *   reading taken twice.
 * - Reading the three defines as bare identifiers answers `1 failed |
 *   11 passed` with `ReferenceError: __DEVTOOLS_COMMIT__ is not
 *   defined`, raised from the unit runner, which is a build `define`
 *   never touched — the production build's shape as well.
 *
 * `bun x tsc --noEmit` exits `0` under all four, the bare-define leg
 * included, and that last one is the reading worth keeping: `string |
 * undefined` is assignable to an optional `commit?: string`, so
 * nothing about a removed `typeof` guard is a type error and only the
 * suite says the guard has gone.
 *
 * The `probe === undefined` check is the opposite case, and it is
 * recorded rather than defended. Deleting it leaves all 12 cases
 * GREEN: `await probe()` on an absent probe throws inside the same
 * `try` the rejection path uses and is swallowed into the same `null`.
 * `tsc` is what reports it, exit `2`, `error TS2722: Cannot invoke an
 * object which is possibly 'undefined'.` The check stays because a
 * fixture build should answer `null` by decision rather than by
 * falling through an exception handler.
 */

import type { ProbeAuthCall } from '../data/auth';
import type { DataSource } from '../data/source';
import type { Corner, DevToolsConfig, DevToolsDisposer } from '@ar/dev-tools';

import { mountDevTools } from '@ar/dev-tools';

import { probeAuth } from '../data/auth';
import { resolveDataSource } from '../data/source';
import { activeSurfaceId } from '../routes/paths';

/**
 * What `devtoolsPlugin()` substitutes while the dev server is serving.
 *
 * Declared, never imported: these are Vite `define` replacements, and
 * a production build has none of them — see this module's
 * documentation on why every read of one is a `typeof` guard.
 */
declare const __DEVTOOLS_COMMIT__: string | undefined;
declare const __DEVTOOLS_BRANCH__: string | undefined;
declare const __DEVTOOLS_ROUND__: string | undefined;

/** Where the trigger starts on every load; deliberately not stored. */
const DEVTOOLS_CORNER: Corner = 'bottom-right';

/** What {@link devToolsExtra} reports where a path names no surface. */
export const DEVTOOLS_NO_SURFACE = 'none';

/** Which data layer this build talks to, decided at build time. */
const DATA_SOURCE: DataSource['kind'] = resolveDataSource(
  import.meta.env?.VITE_AR_API_URL,
).kind;

/**
 * What the app tells a report about itself.
 *
 * Pure, and flat by contract: every value is a primitive, so a feature
 * can put the record straight into a body. The surface is reported
 * beside the raw path because the two answer different questions — a
 * modal sub-route has its own path and is still the lexicon — and a
 * path that names no surface reports {@link DEVTOOLS_NO_SURFACE}
 * rather than dropping the key, so the key set does not depend on
 * where the operator happened to be standing.
 *
 * @param path - The current absolute path, under either route base.
 * @param dataSource - Which data layer this build talks to.
 * @returns The record `DevToolsHost.context()` merges over its own.
 */
export function devToolsExtra(
  path: string,
  dataSource: DataSource['kind'],
): Record<string, string | number | boolean> {
  return {
    route: path,
    surface: activeSurfaceId(path) ?? DEVTOOLS_NO_SURFACE,
    dataSource,
  };
}

/**
 * Ask the service what it is, without ever rejecting.
 *
 * Takes the probe rather than reaching for it, so the fixture answer
 * and the failed-ask answer are both readable without a build. See
 * this module's documentation for why the answer is a reachability
 * reading rather than a version string.
 *
 * @param probe - `../data/auth.ts`'s `probeAuth`: `undefined` under
 * fixtures, a call against the service otherwise.
 * @returns What the service answered, or `null` — for no service, and
 * for every way an ask can fail.
 */
export async function probeDevToolsApiVersion(
  probe: ProbeAuthCall | undefined,
): Promise<string | null> {
  if (probe === undefined) {
    return null;
  }

  try {
    return await probe();
  } catch {
    // A probe is a network call, and a service that is down is its
    // ordinary answer rather than an incident. The version line reads
    // unavailable and the widget carries on.
    return null;
  }
}

/**
 * What this build knows about itself.
 *
 * Every member is absent unless `define` actually replaced it, which
 * is what lets `@ar/dev-tools` fall back to the dev server's own
 * reading and then to `unknown` rather than showing a blank.
 *
 * @returns The commit, branch and round, as far as they were defined.
 */
export function devToolsBuildVersion(): NonNullable<DevToolsConfig['version']> {
  return {
    commit: typeof __DEVTOOLS_COMMIT__ === 'string'
      ? __DEVTOOLS_COMMIT__
      : undefined,
    branch: typeof __DEVTOOLS_BRANCH__ === 'string'
      ? __DEVTOOLS_BRANCH__
      : undefined,
    round: typeof __DEVTOOLS_ROUND__ === 'string'
      ? __DEVTOOLS_ROUND__
      : undefined,
  };
}

/**
 * Mount the dev-tools widget over this app.
 *
 * No feature is configured: this plan ships none, and the package
 * mounts an empty list by default, so the trigger, Position and About
 * are what appears. `endpoint` is left unstated for the same reason —
 * the package's default and the plugin's route are the same path, and
 * naming it here would be a second place for them to disagree.
 *
 * @returns The package's disposer. Calling it takes the widget down;
 * calling it more than once is harmless.
 */
export function startDevTools(): DevToolsDisposer {
  return mountDevTools({
    corner: DEVTOOLS_CORNER,
    features: [],
    version: devToolsBuildVersion(),
    extra: () => devToolsExtra(window.location.pathname, DATA_SOURCE),
    apiVersion: () => probeDevToolsApiVersion(probeAuth),
  });
}
