/**
 * @packageDocumentation
 * The dev-tools wiring: the ONE config `@ar/dev-tools` is mounted
 * with — the three readings that fill it, and the one feature it
 * plugs in.
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
 * ## One feature is configured, and it is handed this app's form
 *
 * {@link devToolsFeatures} plugs in `feedbackFeature()` and nothing
 * else, so the menu gains one row. What the factory is told is one
 * option: `renderForm`. Its `module` and `priority` are deliberately
 * left unstated — the package already files a report under `web`,
 * which is what this app IS, and a second spelling of it here would
 * be a second place for the two to disagree.
 *
 * ## Why the form adapter lives in the APP rather than in the package
 *
 * Decision 9 of `.rafa/specs/q20b-2-feedback-feature.md`, read from
 * this side of the seam. `@ar/dev-tools` depends on no design system
 * — q20b-1's decision 2, and the reason a tool whose job includes
 * reporting a broken stylesheet draws through none — so it ships a
 * plain-HTML renderer of its own and leaves `renderForm` open for an
 * app that has something better to draw with.
 *
 * This app has one: `src/dynamic-form/`, which draws an editable
 * value from a `FieldDef` list in the shell's own language. The
 * translation between the two vocabularies needs BOTH of them —
 * `ReportFormField` from the package and `FieldDef` from the
 * provider — and only one of the two repositories can hold both.
 * Put in the package, that adapter would make `@ar/dev-tools` import
 * `@ar/web`: the dependency this package's first law forbids
 * outright, and backwards besides, since the package is the thing
 * being ported out while the app is what stays behind.
 *
 * There is a second reason, and it outlives the first. The slot is
 * how the widget survives a redesign of the app's form provider: a
 * `FieldDef` union that grows a member, or a `DynamicForm` that
 * changes how it reports an edit, moves `./reportFormAdapter.ts` and
 * `./ReportForm.tsx` and touches nothing the package ships. The
 * package's own renderer keeps working the whole time, which is what
 * makes the default a fallback rather than dead code.
 *
 * So the mapping is `./reportFormAdapter.ts`, the drawing is
 * `./ReportForm.tsx`, and what is LEFT for this file is the one line
 * that names the app's component as the slot's value — a line rather
 * than a module of its own, because both halves of the decision were
 * already taken by the two files it stands in front of.
 * {@link renderDevToolsReportForm} builds that element with
 * `createElement` rather than JSX: this module is the config, it is a
 * `.ts`, and it holds no markup beyond the one component name.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/dev/devtools.test.ts` from `packages/web` against the 20 cases
 * `./devtools.test.ts` holds, and restores this file byte-identical
 * (the harness compared the restored digest to the original, every
 * leg):
 *
 * - Dropping the `catch` from {@link probeDevToolsApiVersion} answers
 *   `Tests  1 failed | 19 passed (20)`: `answers null for a probe that
 *   rejects, rather than rejecting`, as `AssertionError: promise
 *   rejected "Error: offline" instead of resolving`.
 * - Nesting a value inside {@link devToolsExtra}'s record answers `2
 *   failed | 18 passed` — the flatness walk and the route case, that
 *   one as `expected { path: '/digest' } to be '/digest'` — which is
 *   what makes the walk a reading rather than a formality: it can
 *   fail, and this is the leg that proves it.
 * - Reporting the surface as `activeSurfaceId(path)` with no fallback
 *   answers `2 failed | 18 passed`: the path that names no surface and
 *   the index path, both `expected undefined to be 'none'`. The
 *   flatness walk does NOT trip on it, measured — the record it reads
 *   is on a path that HAS a surface — so those cases are not one
 *   reading taken twice.
 * - Reading the three defines as bare identifiers answers `1 failed |
 *   19 passed` with `ReferenceError: __DEVTOOLS_COMMIT__ is not
 *   defined`, raised from the unit runner, which is a build `define`
 *   never touched — the production build's shape as well.
 * - Calling `feedbackFeature()` with no options — this file's whole
 *   contribution to the report form, undone — answers `1 failed | 19
 *   passed`: `hands the drawer the form renderer this app owns`, as
 *   `expected undefined to be [Function renderDevToolsReportForm]`.
 *   The widget still mounts and the row still opens; what is lost is
 *   WHICH form it draws with, silently, since the package's own
 *   renderer draws a working report either way. That single case is
 *   the whole guard on it.
 * - Spelling `module: 'ui'` here rather than leaving the package's
 *   default answers `1 failed | 19 passed`: `leaves the filing module
 *   at the package default`, as `expected 'ui' to be 'web'`.
 * - Hoisting the list to a module constant, so every call answers one
 *   shared feature, answers `1 failed | 19 passed`: `builds a fresh
 *   feature per call`.
 * - Copying {@link renderDevToolsReportForm}'s three arguments — a
 *   spread of the fields, a spread of the values and an `onChange`
 *   wrapper — answers `1 failed | 19 passed`: `passes the three slot
 *   arguments on untouched`, failing on `Object.is equality` between
 *   two records that read identically. Nothing but that case reports
 *   it.
 * - Answering `null` from that renderer answers `3 failed | 17
 *   passed`, every renderer case at once, which is what says they are
 *   readings of an element rather than of a truthy return.
 *
 * `bun x tsc --noEmit` exits `0` under all nine, the bare-define leg
 * included, and that one is the reading worth keeping: `string |
 * undefined` is assignable to an optional `commit?: string`, so
 * nothing about a removed `typeof` guard is a type error and only the
 * suite says the guard has gone.
 *
 * ## ... and the two opposite cases, recorded rather than defended
 *
 * The `probe === undefined` check is the first. Deleting it leaves
 * all 20 cases GREEN: `await probe()` on an absent probe throws
 * inside the same `try` the rejection path uses and is swallowed into
 * the same `null`. `tsc` is what reports it, exit `2`, `error TS2722:
 * Cannot invoke an object which is possibly 'undefined'.` The check
 * stays because a fixture build should answer `null` by decision
 * rather than by falling through an exception handler.
 *
 * {@link startDevTools}'s `features` member is the second, and there
 * NOTHING reports it. Passing `features: []` while
 * {@link devToolsFeatures} still answers the list leaves all 20 cases
 * green, `tsc` at `0` and `lint` at `0` — all three measured. The
 * unit runner is node-only and `mountDevTools` appends to
 * `document.body`, so no case in this project can call that function
 * at all, and no spec drives the app's own widget today: the
 * dev-tools e2e spec runs against a harness page that configures its
 * own features. What will read this member is the forced Playwright
 * spec this plan's E2E stage adds, which opens the widget over the
 * app and clicks the `Report feedback` row.
 */

import type { ProbeAuthCall } from '../data/auth';
import type { DataSource } from '../data/source';
import type {
  Corner,
  DevToolsConfig,
  DevToolsDisposer,
  DevToolsFeature,
} from '@ar/dev-tools';
import type { ReportFormRenderer } from '@ar/dev-tools/feedback';

import { mountDevTools } from '@ar/dev-tools';
import { feedbackFeature } from '@ar/dev-tools/feedback';
import { createElement } from 'react';

import { probeAuth } from '../data/auth';
import { resolveDataSource } from '../data/source';
import { activeSurfaceId } from '../routes/paths';

import { ReportForm } from './ReportForm';

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
 * Draw a report template's fields as this app's own form.
 *
 * The package's `renderForm` slot, filled, and it decides nothing:
 * `./reportFormAdapter.ts` owns the mapping and `./ReportForm.tsx`
 * owns the drawing, so what is here is the component named and the
 * slot's three arguments passed on unchanged. See this module's
 * documentation for why that pair sits in the app at all.
 *
 * @param fields - The chosen template's fields in template order,
 * with the screenshot descriptor already withheld by the feature.
 * @param values - Every answer so far, keyed by field id.
 * @param onChange - Called with the WHOLE next record on every edit.
 * @returns The element the drawer places inside its own `<form>`.
 */
export const renderDevToolsReportForm: ReportFormRenderer = (
  fields,
  values,
  onChange,
) => createElement(ReportForm, { fields, values, onChange });

/**
 * What this app plugs into the widget.
 *
 * One feature — the package's own feedback feature, handed
 * {@link renderDevToolsReportForm} and nothing else. `module` and
 * `priority` are left unstated for the reason `endpoint` is below:
 * the package already files under `web`, which is what this app IS.
 *
 * Fresh per call, because a feature holds per-host state of its own
 * (the derived host it memoises for the drawer), and
 * {@link startDevTools} calls this once per mount.
 *
 * @returns The list `DevToolsConfig.features` takes, in menu order.
 */
export function devToolsFeatures(): readonly DevToolsFeature[] {
  return [feedbackFeature({ renderForm: renderDevToolsReportForm })];
}

/**
 * Mount the dev-tools widget over this app.
 *
 * {@link devToolsFeatures} is the whole plug-in list, so the trigger,
 * Position, About and one `Report feedback` row are what appears.
 * `endpoint` is left unstated — the package's default and the
 * plugin's route are the same path, and naming it here would be a
 * second place for them to disagree.
 *
 * @returns The package's disposer. Calling it takes the widget down;
 * calling it more than once is harmless.
 */
export function startDevTools(): DevToolsDisposer {
  return mountDevTools({
    corner: DEVTOOLS_CORNER,
    features: devToolsFeatures(),
    version: devToolsBuildVersion(),
    extra: () => devToolsExtra(window.location.pathname, DATA_SOURCE),
    apiVersion: () => probeDevToolsApiVersion(probeAuth),
  });
}
