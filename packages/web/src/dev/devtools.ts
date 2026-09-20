/**
 * @packageDocumentation
 * The dev-tools wiring: the ONE config `@ar/dev-tools` is mounted
 * with — the three readings that fill it, the one feature it plugs
 * in, and the decision that says whether `./bridge.ts` goes up behind
 * it.
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
 * ## ... and why the package's stylesheet is imported from HERE
 *
 * `@ar/dev-tools/styles.css` is the package's only stylesheet, it is
 * imported from no module the package ships, and the consuming app
 * opts in — the shape that stylesheet's own header records. This app
 * had never written that opt-in, so the widget drew unstyled under
 * `bun run dev`; issue #103 is the filing of it, and the side-effect
 * import below is the close.
 *
 * It is written in THIS module rather than in `../styles.css`
 * beside `tailwindcss` and `@ar/ui/styles.css`, because those two
 * are reached from `../main.tsx` unconditionally and would carry the
 * widget's rules into every production build. This module is reached
 * only through `../main.tsx`'s `import.meta.env.DEV` branch, which a
 * build replaces with `false` and then eliminates along with the
 * dynamic import inside it, so the stylesheet is a dev-server-only
 * asset for the same reason every other decision here is.
 *
 * Measured rather than asserted, over a `bun run build` of this
 * package: `grep -c devtools` over the emitted stylesheet,
 * `dist/assets/index-*.css`, answers `0`. The control is the same
 * grep over that stylesheet CONCATENATED with
 * `packages/dev-tools/dist/styles.css`, which answers `245` — so the
 * zero is a reading that could have come out non-zero rather than a
 * grep that matched nothing anywhere.
 *
 * `grep -rl devtools packages/web/dist/` does name one file, the JS
 * bundle, and none of what it holds is this import. Re-measured over
 * a `bun run build` once the bridge landed, because the count moved:
 * FOUR occurrences, not the one this paragraph used to record. One is
 * the string `devtools:` in react-router's list of unsafe URL
 * protocols and predates everything here; the other three are the
 * app's OWN `devtools` signal topic — `../app-shell/appSignals.ts`'s
 * roster and `../app-shell/CrashFallback.tsx`'s subscribe — which is
 * production app code by decision 2 of
 * `.rafa/specs/q20b-3-error-boundary-provider.md` and names no
 * package.
 *
 * What says the package itself is absent is a sweep of seven
 * discriminating literals over `dist/`, all `0`: `About`,
 * `mountDevTools`, `data-devtools-root`, `__DEVTOOLS_COMMIT__`,
 * `devtoolsBus`, `installGlobalCapture` and `shouldMountDevTools` —
 * the last two being exactly what this module started importing. The
 * control is `Agentic Research` over the same tree, which answers
 * `1`. The capture of all of it is in this plan's close-out notes.
 *
 * ## The bridge goes up only when the widget really mounted
 *
 * `./bridge.ts` holds the wiring between `../app-shell/appSignals.ts`
 * and the package's bus, and {@link startDevToolsOver} is the one
 * place it is installed. Behind a reading rather than
 * unconditionally, because a bridge over a widget that REFUSED
 * publishes `devtools` `{installed: true}` to a fallback whose
 * "report this" button then has nowhere to go: that button opens a
 * menu row, and there is no menu.
 *
 * The reading is `shouldMountDevTools` over the same config and the
 * same two environment readings `mountDevTools` takes it over itself,
 * which is why the package exports all three rather than the
 * predicate alone. The alternative was reading the environment from
 * here, and it is worse than it looks: `navigator.webdriver` is easy
 * enough, but `VITE_DEVTOOLS_FORCE=0` is a non-empty string, so an
 * app testing that variable for truthiness reads the override as ON
 * where the package's own negatives read it as off. The case that has
 * to come out right is the default e2e server — `navigator.webdriver`
 * true, no override — and it now reads exactly as a production build
 * does.
 *
 * `mount(config)` is called through BOTH branches. The package owns
 * its own refusal and answers a disposer either way, so nothing here
 * second-guesses whether to call it; what the reading gates is
 * whether the app is wired to what it drew.
 *
 * ## ... and one disposer takes both halves down, bridge first
 *
 * `../main.tsx` holds whatever {@link startDevTools} answers, and it
 * has one thing to call. The bridge goes first because it is the half
 * that can still publish onto the bus, and its own teardown ends by
 * announcing `{installed: false}` — so by the time the widget is
 * removed, nothing is left that would try to reach it.
 *
 * The `disposed` flag is held HERE and not borrowed. Both halves are
 * idempotent today, but one of them arrives as an ARGUMENT, so the
 * promise this function's return value makes is only kept if this
 * function keeps it. React StrictMode runs an effect cleanup twice
 * and this app renders under it.
 *
 * ## Why the composition takes its collaborators as arguments
 *
 * {@link startDevToolsOver} is handed the mount, the signals, the bus
 * and the capture; {@link startDevTools} is the one line that fills
 * all seven members with the real ones. The split is what makes any
 * of this readable at all: `mountDevTools` appends to `document.body`
 * and this package's unit runner is node-only, so a function that
 * reached for the real five could be covered by no case here — and
 * the package's `devtoolsBus` is a singleton whose ring every later
 * case would then read. `./bridge.ts` states the same seam for the
 * same reason; this module composes over it rather than repeating it.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/dev/devtools.test.ts` from `packages/web` against the 32 cases
 * `./devtools.test.ts` holds, and restores this file byte-identical
 * (the harness compared the restored `sha256` to the original, every
 * leg). All sixteen were re-measured when the bridge landed, because
 * the file grew by twelve cases and every passed count below moved
 * with it:
 *
 * - Dropping the `catch` from {@link probeDevToolsApiVersion} answers
 *   `Tests  1 failed | 31 passed (32)`: `answers null for a probe that
 *   rejects, rather than rejecting`, as `AssertionError: promise
 *   rejected "Error: offline" instead of resolving`.
 * - Nesting a value inside {@link devToolsExtra}'s record answers `2
 *   failed | 30 passed` — the flatness walk and the route case, that
 *   one as `expected { path: '/digest' } to be '/digest'` — which is
 *   what makes the walk a reading rather than a formality: it can
 *   fail, and this is the leg that proves it.
 * - Reporting the surface as `activeSurfaceId(path)` with no fallback
 *   answers `2 failed | 30 passed`: the path that names no surface and
 *   the index path, both `expected undefined to be 'none'`. The
 *   flatness walk does NOT trip on it, measured — the record it reads
 *   is on a path that HAS a surface — so those cases are not one
 *   reading taken twice.
 * - Reading the three defines as bare identifiers answers `12 failed |
 *   20 passed` with `ReferenceError: __DEVTOOLS_COMMIT__ is not
 *   defined`, raised from the unit runner, which is a build `define`
 *   never touched — the production build's shape as well. It used to
 *   red ONE case; it now reds twelve, because {@link devToolsConfig}
 *   reads {@link devToolsBuildVersion} and every start case builds a
 *   config. That widening is the leg saying what the config is now
 *   load-bearing for.
 * - Calling `feedbackFeature()` with no options — this file's whole
 *   contribution to the report form, undone — answers `1 failed | 31
 *   passed`: `hands the drawer the form renderer this app owns`, as
 *   `expected undefined to be [Function renderDevToolsReportForm]`.
 *   The widget still mounts and the row still opens; what is lost is
 *   WHICH form it draws with, silently, since the package's own
 *   renderer draws a working report either way. That single case is
 *   the whole guard on it.
 * - Spelling `module: 'ui'` here rather than leaving the package's
 *   default answers `1 failed | 31 passed`: `leaves the filing module
 *   at the package default`, as `expected 'ui' to be 'web'`.
 * - Hoisting the list to a module constant, so every call answers one
 *   shared feature, answers `1 failed | 31 passed`: `builds a fresh
 *   feature per call`.
 * - Copying {@link renderDevToolsReportForm}'s three arguments — a
 *   spread of the fields, a spread of the values and an `onChange`
 *   wrapper — answers `1 failed | 31 passed`: `passes the three slot
 *   arguments on untouched`, failing on `Object.is equality` between
 *   two records that read identically. Nothing but that case reports
 *   it.
 * - Answering `null` from that renderer answers `3 failed | 29
 *   passed`, every renderer case at once, which is what says they are
 *   readings of an element rather than of a truthy return.
 *
 * The seven legs the bridge added are read the same way:
 *
 * - Dropping the `shouldMountDevTools` gate — installing the bridge
 *   whatever the environment said — answers `3 failed | 29 passed`:
 *   both automation cases and `installs no bridge for a config the
 *   widget would draw nothing for`.
 * - Taking the reading over a FRESH {@link devToolsConfig} rather than
 *   the one the mount is handed answers `1 failed | 31 passed`, that
 *   one, and nothing else. It is the leg that says the config case
 *   below is not decoration: two configs agree on the environment and
 *   can disagree on `showEmpty`, and only a config-shaped refusal
 *   reads the difference.
 * - Installing the bridge on the package's shared `devtoolsBus`
 *   instead of the bus it was handed answers `4 failed | 28 passed` —
 *   every case that reads what the injected bus saw, the automation
 *   refusal among them, since its control publishes four payloads and
 *   sees none.
 * - Dropping the `disposed` flag answers `1 failed | 31 passed`:
 *   `takes each half down once for a disposer called twice`. The mount
 *   stub in `./devtools.test.ts` is deliberately NOT idempotent, which
 *   is what leaves that reading to this file rather than to the stub.
 * - Taking the widget down before the bridge answers `1 failed | 31
 *   passed`: `takes the bridge down before the widget`, the only case
 *   that reads order, and it reads it from two marks pushed as they
 *   happen rather than from a list compared afterwards.
 * - Leaving the bridge out of the teardown entirely answers `3 failed
 *   | 29 passed`: the disposal announcement, the disposer-twice case
 *   and the ordering case.
 * - Skipping the mount when the reading refuses answers `1 failed | 31
 *   passed`: `calls the mount even when it installs no bridge`. That
 *   single case is the whole guard on the package keeping its own
 *   refusal.
 *
 * `bun x tsc --noEmit` exits `0` under all sixteen, the bare-define
 * leg included, and that one is the reading worth keeping: `string |
 * undefined` is assignable to an optional `commit?: string`, so
 * nothing about a removed `typeof` guard is a type error and only the
 * suite says the guard has gone. `bun x eslint src/dev/devtools.ts`
 * exits `0` under eleven of the sixteen and `1` under five, every one
 * of those five on `@typescript-eslint/no-unused-vars` over a binding
 * the mutation orphaned — plus a `prefer-const` over the same
 * binding in the `disposed` leg — rather than on the behaviour each
 * changed. A lint run is therefore not a reading of any leg here.
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
 * {@link devToolsConfig}'s `features` member is the second, and there
 * NOTHING reports it. Passing `features: []` while
 * {@link devToolsFeatures} still answers the list leaves all 32 cases
 * green, `tsc` at `0` and `lint` at `0` — all three measured again
 * with the bridge in place. The cases DO drive that config now, but
 * they read the mount's copy of it and the decision taken over it,
 * neither of which cares what is in the list: `shouldMountDevTools`
 * counts an empty list only when `showEmpty` is `false`, and this app
 * never says so. No spec drives the app's own widget today either —
 * the dev-tools e2e spec runs against a harness page that configures
 * its own features. What will read this member is the forced
 * Playwright spec this plan's E2E stage adds, which opens the widget
 * over the app and clicks the `Report feedback` row.
 *
 * {@link startDevTools} itself is the third and is the same shape:
 * the seven members it fills are the real mount, the real channel,
 * the real bus and the real capture, and a case that could read them
 * would have to mount a widget into a `document` this runner does not
 * have. The e2e stage's forced spec is what reads them, through the
 * widget it opens.
 */

import type { DevToolsCaptureInstaller } from './bridge';
import type { AppSignals } from '../app-shell/appSignals';
import type { ProbeAuthCall } from '../data/auth';
import type { DataSource } from '../data/source';
import type {
  Corner,
  DevToolsBus,
  DevToolsConfig,
  DevToolsDisposer,
  DevToolsFeature,
} from '@ar/dev-tools';
import type { ReportFormRenderer } from '@ar/dev-tools/feedback';

import {
  devtoolsBus,
  installGlobalCapture,
  isDevToolsAutomated,
  isDevToolsForced,
  mountDevTools,
  shouldMountDevTools,
} from '@ar/dev-tools';
import { feedbackFeature } from '@ar/dev-tools/feedback';
import { createElement } from 'react';

import { appSignals } from '../app-shell/appSignals';
import { probeAuth } from '../data/auth';
import { resolveDataSource } from '../data/source';
import { activeSurfaceId } from '../routes/paths';

import { installDevToolsBridge } from './bridge';
import { ReportForm } from './ReportForm';

import '@ar/dev-tools/styles.css';

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
 * The whole of what this app tells the widget about itself.
 *
 * Its own function rather than an object literal inside
 * {@link startDevTools}, because the config is read TWICE now: the
 * mount takes it, and so does the decision that gates the bridge. One
 * value passed to both is what makes "the same config" a fact rather
 * than a claim — see this module's documentation.
 *
 * `endpoint` is left unstated — the package's default and the
 * plugin's route are the same path, and naming it here would be a
 * second place for them to disagree.
 *
 * @returns The config `mountDevTools` is called with, fresh per call
 * because {@link devToolsFeatures} is.
 */
export function devToolsConfig(): DevToolsConfig {
  return {
    corner: DEVTOOLS_CORNER,
    features: devToolsFeatures(),
    version: devToolsBuildVersion(),
    extra: () => devToolsExtra(window.location.pathname, DATA_SOURCE),
    apiVersion: () => probeDevToolsApiVersion(probeAuth),
  };
}

/** Everything {@link startDevToolsOver} is handed, and never reaches for. */
export interface DevToolsStartInput {
  /** What both the mount and the decision read. */
  readonly config: DevToolsConfig;

  /** `isDevToolsAutomated()` in the app; a fixed reading in a case. */
  readonly automated: boolean;

  /** `isDevToolsForced()` in the app; a fixed reading in a case. */
  readonly forced: boolean;

  /** `mountDevTools` in the app; a recording stub in a case. */
  readonly mount: (config: DevToolsConfig) => DevToolsDisposer;

  /** The app's channel — `appSignals` in the app, a fresh one in a case. */
  readonly signals: AppSignals;

  /** The widget's bus — `devtoolsBus` in the app, an injected one in a case. */
  readonly bus: DevToolsBus;

  /** `installGlobalCapture` in the app; a stub in a case. */
  readonly capture: DevToolsCaptureInstaller;
}

/**
 * Mount the widget and, only if it really mounted, bridge the app to
 * it.
 *
 * The composition, over collaborators it is handed rather than ones it
 * reaches for: `mountDevTools` appends to `document.body` and the unit
 * runner here is node-only, so a function that imported the real four
 * could be read by no case in this package. See this module's
 * documentation for the decision it takes and the order it takes
 * things down in.
 *
 * @param input - The config, the two environment readings, the mount
 * and the bridge's own three collaborators.
 * @returns ONE disposer, covering the widget and the bridge. Calling
 * it more than once is harmless.
 */
export function startDevToolsOver(input: DevToolsStartInput): DevToolsDisposer {
  const { config, automated, forced, mount, signals, bus, capture } = input;

  // Taken BEFORE the mount, and over the same config and the same two
  // readings the mount takes it over itself, so the two answers are
  // identical by construction rather than by review.
  const mounting = shouldMountDevTools({ config, automated, forced });

  // Called either way: the package owns its own refusal and answers a
  // disposer through both branches, so nothing here second-guesses it.
  // What the reading above gates is the BRIDGE.
  const disposeWidget = mount(config);

  if (!mounting) {
    return disposeWidget;
  }

  const disposeBridge = installDevToolsBridge({ signals, bus, capture });

  // Held HERE and not borrowed from the two halves. Both of them are
  // idempotent today, but one of them arrives as an argument — a
  // case's stub, or whatever a later caller passes as `mount` — so a
  // promise this function makes about its own return value is kept
  // only if this function keeps it. A React effect cleanup runs twice
  // under StrictMode, and this app renders under it.
  let disposed = false;

  return () => {
    if (disposed) {
      return;
    }

    disposed = true;

    // The bridge first. It is the half that can still publish onto the
    // bus, and its own teardown ends by announcing `{installed:
    // false}` — so by the time the widget goes, nothing is left that
    // would try to reach it.
    disposeBridge();
    disposeWidget();
  };
}

/**
 * Mount the dev-tools widget over this app, and wire the app to it.
 *
 * {@link devToolsFeatures} is the whole plug-in list, so the trigger,
 * Position, About and one `Report feedback` row are what appears.
 * {@link startDevToolsOver} is the whole of the behaviour; this
 * function is the line that fills its seven members with the real
 * ones, and it is the only place in the app that names
 * `appSignals` and `devtoolsBus` together.
 *
 * @returns One disposer, taking down the bridge and then the widget.
 * Calling it more than once is harmless.
 */
export function startDevTools(): DevToolsDisposer {
  return startDevToolsOver({
    config: devToolsConfig(),
    automated: isDevToolsAutomated(),
    forced: isDevToolsForced(),
    mount: mountDevTools,
    signals: appSignals,
    bus: devtoolsBus,
    capture: installGlobalCapture,
  });
}
