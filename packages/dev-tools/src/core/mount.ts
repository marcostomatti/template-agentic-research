/**
 * @packageDocumentation
 * The entry point: `mountDevTools(config)`, the two rules that decide
 * whether anything is drawn at all, and the disposer that takes it
 * back down.
 *
 * Everything else in this package is reached FROM here and reaches
 * nothing back: `./Shell.tsx` holds the state, `./host.ts` builds what
 * a feature is handed, `./menuModel.ts` turns the configured features
 * into rows. This module is the only one a consuming app calls, and
 * `../index.ts` re-exports it as the whole of the browser API
 * alongside `devtoolsBus` and the contract types.
 *
 * ## The sibling root, and why it is not the app's
 *
 * Decision 3 of `.rafa/specs/q20b-1-dev-tools-shell.md`:
 * {@link mountDevTools} appends a `<div data-devtools-root>` to
 * `document.body` and calls its OWN `createRoot`. An uncaught error
 * unmounts the whole root it escapes to, so a reporter rendered inside
 * the app's tree would disappear at exactly the moment a crash is
 * worth reporting. Two roots, two blast radii.
 *
 * The consequence runs the other way too and is the reason this
 * function does not throw for a bad config. `./host.ts` refuses an
 * endpoint that names an origin by THROWING, and that throw happens in
 * `buildDevToolsHost` during the shell's render — inside the widget's
 * own root, where it takes the widget down and leaves the app
 * standing. Doing the same check eagerly here would move the throw to
 * the app's bootstrap, where `mountDevTools(...)` is typically one
 * statement above `createRoot(app)`, and a misconfigured dev tool
 * would take the application with it. So
 * {@link fetchDevToolsStatus} swallows the same refusal — see its own
 * documentation — and the loud complaint is left to the render path
 * that was built to contain it.
 *
 * ## Two independent refusals, ANDed by {@link shouldMountDevTools}
 *
 * - **Automation** (decision 4). `navigator.webdriver` true and the
 *   widget is not mounted, so the visual baselines and the e2e suite
 *   never photograph a tomato that is not part of the app.
 *   `VITE_DEVTOOLS_FORCE` overrides it, which is how the forced
 *   Playwright spec gets a widget to drive.
 * - **No features** (spec item 7). `features` empty AND
 *   `showEmpty: false` and nothing is appended to the document at all.
 *   The default is `true`, so during this plan — which ships no
 *   feature — the shell mounts on its own: Position, About and the
 *   settings row are the widget's own and are worth having before
 *   anything plugs in.
 *
 * "Empty" is read as `features.length === 0` and NOT as "no feature
 * answered `isEnabled`". {@link DevToolsFeature.isEnabled} is asked a
 * question about a {@link DevToolsHost}, and no host exists at the
 * moment this decision is taken — one cannot be built before the
 * status fetch this function starts AFTER deciding. Enabled-ness also
 * changes while the widget is mounted, and a mount decision cannot be
 * retaken. So a feature that is present but currently disabled counts
 * as plugged in, and the app that wants the stricter reading passes a
 * shorter array.
 *
 * ## The status fetch is total, and the first paint does not wait
 *
 * The shell is rendered ONCE with `status: null` before anything is
 * asked of the network, and re-rendered when the answers arrive. A
 * widget that appeared only after a dev server had answered would be
 * missing exactly when the dev server is what broke.
 *
 * The two probes are independent and run in PARALLEL: the status
 * endpoint is the dev server's reading of the repository, and
 * {@link DevToolsConfig.apiVersion} is the app's probe of a third
 * party. Neither rejects — {@link fetchDevToolsStatus} and
 * `resolveDevToolsApiVersion` are both total — so the `Promise.all`
 * below needs no rejection handler, and an unreachable dev server
 * costs the About panel its commit and nothing else.
 *
 * ## The force flag is read out of a BUILT artefact
 *
 * `VITE_DEVTOOLS_FORCE` is an environment variable, and this package
 * is consumed as `dist/index.js` rather than as source — the same
 * asymmetry `./types.ts` records for the `__DEVTOOLS_*` constants,
 * where `define` rewrites source a dev server transforms and never
 * touches a built file. The reading here is better than that one, and
 * it was measured rather than assumed: `bun run build` emits
 * `import.meta.env?.[Dt]` into `dist/index.js` verbatim, with the key
 * still a string constant, and so does the literal spelling
 * `import.meta.env?.VITE_DEVTOOLS_FORCE` (both measured on vite
 * 8.3.0). Nothing is folded at THIS package's build time, so the
 * expression is left for the consuming app's pipeline to resolve,
 * which is the only pipeline that knows what the operator exported.
 *
 * The optional chain is load-bearing all the same: a runtime that
 * never went through a Vite pipeline at all has no `env` on
 * `import.meta`, and a bare property read would answer a `TypeError`
 * at mount where a missing override should answer `false`.
 *
 * ## Why the status payload is narrowed by hand and not by zod
 *
 * `zod` is a runtime dependency of this package and the node plugin
 * validates the report BODY with it, because that body is untrusted
 * input crossing a process boundary with a schema worth stating once.
 * The status payload is the opposite shape of problem: five members,
 * read from a same-origin path served by the dev server this widget
 * ships with, and every one of them has a defined answer for "the
 * server did not say". {@link parseDevToolsStatus} is therefore a
 * narrowing rather than a schema, and the browser entry stays free of
 * a dependency a consuming app would otherwise have to resolve for a
 * tool it only runs in development.
 *
 * ## It is a `.ts`, and it builds its elements rather than writing JSX
 *
 * Two-runner discipline: every decision lives in a `.ts` the vitest
 * jsdom project collects, and a `.tsx` stays thin. The decisions
 * above are decisions, so they live here, and the one React element
 * this module needs is built with `createElement` rather than JSX so
 * the file can stay a `.ts` that the jsdom project actually collects.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/core/mount.test.ts` from `packages/dev-tools` against the 32
 * cases the file holds, and restores this file byte-identical (the
 * harness compared the restored text to the original, every leg):
 *
 * - Deleting the automation guard from {@link shouldMountDevTools}
 *   answers `Tests  2 failed | 30 passed (32)`: `refuses under
 *   automation while the force flag is off` and `appends nothing under
 *   automation` — the same rule read once as a boolean and once as a
 *   document.
 * - Dropping the `forced` override — `if (input.automated)` alone —
 *   answers `1 failed | 31 passed`: `mounts under automation when the
 *   force flag is on`. Only one, because no case mounts a DOCUMENT
 *   under a forced driver; the e2e stage's forced spec is what reads
 *   that pair together.
 * - Defaulting {@link DevToolsConfig.showEmpty} to `false` answers `3
 *   failed | 29 passed`, and the two extra failures are the point:
 *   `mounts an empty feature list when showEmpty says nothing` plus
 *   `appends one root element to the body` and `removes the element on
 *   dispose, twice over`, both of which mount a config that says
 *   nothing.
 * - Reading the empty rule as `showEmpty` ALONE, without the emptiness
 *   test, answers `1 failed | 31 passed`: `mounts a configured feature
 *   even when showEmpty is false`.
 * - Reducing {@link isDevToolsForceValue} to `value !== undefined`
 *   answers `2 failed | 30 passed`: the walk over the eleven values
 *   that are not a yes, and `answers false when the key is set to a
 *   value meaning off`, which is the same decision read through
 *   `import.meta.env` rather than through an argument.
 * - Letting {@link parseDevToolsStatus} accept an array answers `2
 *   failed | 30 passed`; reading `persistence` as truthy rather than
 *   as literally `true` answers `1 failed | 31 passed`.
 * - Replacing the `catch` in {@link fetchDevToolsStatus} with a
 *   `finally` answers `3 failed | 29 passed` AND `Errors  2 errors`:
 *   the transport rejection, the body that is not JSON, and the
 *   endpoint that names an origin. Two of the three arrive as
 *   unhandled rejections, which is what that function exists to stop
 *   reaching an app's bootstrap.
 * - Ignoring `response.ok` answers `1 failed | 31 passed`.
 * - Deleting the `disposed` guard inside `draw` answers `Tests  32
 *   passed (32)` — no case reds — but `Errors  1 error`, `Error:
 *   Cannot update an unmounted root.` raised from `draw` through the
 *   settled `Promise.all`, and vitest exits `1`. So the gate reports
 *   it and the test list does not: a reader scanning for a red case
 *   name would call this file green over a broken guard, and only the
 *   exit code says otherwise.
 *
 * `bun x tsc --noEmit` exits `0` under ALL TEN of those, measured one
 * by one. Every mutation above is a behaviour change over types that
 * still line up, so `bun run check-types` would never report one.
 */

import type { DevToolsFetch } from './host';
import type { DevToolsConfig, DevToolsStatus } from './types';
import type { Root } from 'react-dom/client';

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import {
  DEVTOOLS_UNKNOWN_VERSION,
  joinDevToolsPath,
  normaliseDevToolsEndpoint,
  resolveDevToolsApiVersion,
} from './host';
import { DevToolsShell } from './Shell';

/**
 * The attribute that marks the widget's root element.
 *
 * An attribute rather than an id or a class, for two reasons that
 * outlive this file: `../styles.css` scopes EVERY selector it carries
 * under `[data-devtools-root]`, so the widget cannot style the app and
 * the app's reset cannot flatten the widget; and an id would collide
 * exactly once, silently, in an app that happened to use the same one.
 */
export const DEVTOOLS_ROOT_ATTRIBUTE = 'data-devtools-root';

/**
 * The environment variable that overrides the automation guard.
 *
 * `VITE_`-prefixed because that is the only prefix Vite exposes to
 * browser code, and `DEVTOOLS` rather than `AR` because every name
 * this package introduces survives the port to open-tomato unchanged.
 */
export const DEVTOOLS_FORCE_ENV_KEY = 'VITE_DEVTOOLS_FORCE';

/** What is asked of the endpoint to learn what build is running. */
export const DEVTOOLS_STATUS_PATH = 'status';

/**
 * What {@link DevToolsStatus.gateway} reads when none is configured.
 *
 * `'none'` is this plan's only answer: the gateway interface is
 * declared with no implementation.
 */
export const DEVTOOLS_GATEWAY_NONE = 'none';

/**
 * Force values that mean "not set".
 *
 * A Vite environment variable is always a STRING, so an operator who
 * meant to switch the override off by writing `VITE_DEVTOOLS_FORCE=0`
 * — or a shell that expanded an unset variable to `''` — would
 * otherwise be read as having switched it on.
 */
const FORCE_NEGATIVES: readonly string[] = ['', '0', 'false'];

/**
 * What a call to {@link mountDevTools} hands back.
 *
 * Always returned, including when neither rule let the widget mount,
 * so a caller has one shape to store and one thing to call in its own
 * teardown. Calling it more than once is harmless.
 */
export type DevToolsDisposer = () => void;

/**
 * The disposer a refused mount answers.
 *
 * Shared rather than built per call: there is nothing to take down,
 * and a caller comparing identities is not a case this package needs
 * to support.
 */
const NOTHING_TO_DISPOSE: DevToolsDisposer = () => undefined;

/** What `import.meta` carries once a Vite build has touched it. */
interface DevToolsImportMetaEnv {
  /** The exposed environment, absent outside a Vite pipeline. */
  readonly env?: Readonly<Record<string, unknown>>;
}

/** What {@link shouldMountDevTools} needs to answer. */
export interface DevToolsMountDecision {
  /** What the app passed to {@link mountDevTools}. */
  readonly config: DevToolsConfig;

  /** Whether `navigator.webdriver` is true. */
  readonly automated: boolean;

  /** Whether {@link DEVTOOLS_FORCE_ENV_KEY} is set. */
  readonly forced: boolean;
}

/**
 * Whether an environment value means the override is on.
 *
 * Its own function because "set" is a decision rather than a read: the
 * three spellings in {@link FORCE_NEGATIVES} are the ones an operator
 * reaches for to turn something OFF, and reading them as on would make
 * the guard unswitchable from a `.env` file.
 *
 * @param value - Whatever the environment carried under the key.
 * @returns `true` for the boolean `true` or any string that is not a
 * blank, a `0` or a `false`.
 */
export function isDevToolsForceValue(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  return !FORCE_NEGATIVES.includes(value.trim().toLowerCase());
}

/**
 * Whether the automation override is set in this build.
 *
 * Read through an optional member, never as a bare property: see this
 * module's documentation on what survives the library build and why a
 * runtime with no Vite pipeline behind it must answer `false` rather
 * than throw.
 *
 * @returns `true` when the override is on.
 */
export function isDevToolsForced(): boolean {
  const meta: ImportMeta & DevToolsImportMetaEnv = import.meta;

  return isDevToolsForceValue(meta.env?.[DEVTOOLS_FORCE_ENV_KEY]);
}

/**
 * Whether a driver is holding the browser.
 *
 * @returns `true` when `navigator.webdriver` is true.
 */
export function isDevToolsAutomated(): boolean {
  return typeof navigator !== 'undefined' && navigator.webdriver === true;
}

/**
 * Whether to draw anything at all.
 *
 * Pure, and the whole of both refusals — see this module's
 * documentation for what each one is for and why "empty" counts
 * configured features rather than enabled ones.
 *
 * @param input - The config and the two readings taken of the
 * environment around it.
 * @returns `true` to mount.
 */
export function shouldMountDevTools(input: DevToolsMountDecision): boolean {
  if (input.automated && !input.forced) {
    return false;
  }

  const showEmpty = input.config.showEmpty ?? true;

  return showEmpty || input.config.features.length > 0;
}

/**
 * Read one string member of an untrusted record.
 *
 * @param value - Whatever was under the key.
 * @param fallback - What to answer when it was not a usable string.
 * @returns The trimmed-non-blank string, or the fallback.
 */
function readStatusString(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  return value;
}

/**
 * Narrow whatever the status endpoint answered.
 *
 * Every member has a defined answer for "the server did not say", so a
 * payload missing one is completed rather than refused — the About
 * panel showing `unknown` for a branch is worth more than no About
 * panel. What IS refused is a body that is not a record at all: an
 * HTML error page, a bare string, an array, a `null`. That is the
 * shape a proxy or a 404 handler answers with, and treating it as a
 * status would put five fabricated defaults where a real reading
 * belongs.
 *
 * `persistence` is read as literally `true` and nothing else. It gates
 * whether the "Save settings" row is drawn, so a `'true'` string from
 * a hand-rolled endpoint draws no row rather than a row whose
 * behaviour this plan defers.
 *
 * @param value - The parsed response body.
 * @returns The status, or `null` when the body is not a record.
 */
export function parseDevToolsStatus(value: unknown): DevToolsStatus | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return Object.freeze({
    commit: readStatusString(record.commit, DEVTOOLS_UNKNOWN_VERSION),
    branch: readStatusString(record.branch, DEVTOOLS_UNKNOWN_VERSION),
    round: readStatusString(record.round, DEVTOOLS_UNKNOWN_VERSION),
    persistence: record.persistence === true,
    gateway: readStatusString(record.gateway, DEVTOOLS_GATEWAY_NONE),
  });
}

/**
 * Ask the dev server what build is running.
 *
 * Total: an unreachable server, a non-2xx answer, a body that is not
 * JSON, a body that is not a record, and a configured endpoint
 * `./host.ts` refuses to normalise all answer `null`, which every
 * reader already handles as "before one arrived".
 *
 * The refused endpoint is the one worth naming. `mountDevTools` runs
 * in the app's bootstrap, and letting that refusal out of here would
 * make a misconfigured dev tool take the application's start-up with
 * it. The complaint is not lost — the shell's own render calls
 * `buildDevToolsHost`, which throws the same error inside the widget's
 * own root, where decision 3 put it.
 *
 * @param config - What the app passed to {@link mountDevTools}.
 * @param fetchImpl - How to reach the network; the platform `fetch` by
 * default, injectable so the join can be proved without one.
 * @returns The status, or `null`.
 */
export async function fetchDevToolsStatus(
  config: DevToolsConfig,
  fetchImpl?: DevToolsFetch,
): Promise<DevToolsStatus | null> {
  const send = fetchImpl ?? ((url, init) => fetch(url, init));

  try {
    const endpoint = normaliseDevToolsEndpoint(config.endpoint);
    const response = await send(
      joinDevToolsPath(endpoint, DEVTOOLS_STATUS_PATH),
      { headers: { accept: 'application/json' } },
    );

    if (!response.ok) {
      return null;
    }

    return parseDevToolsStatus(await response.json());
  } catch {
    // A dev server that is down, answering HTML, or configured at an
    // endpoint this package refuses is the ordinary state of a tool
    // whose whole job is to be useful while things are broken.
    return null;
  }
}

/**
 * Build the element the widget's own React root renders into.
 *
 * Detached: the caller decides when it enters the document, which is
 * what lets {@link mountDevTools} take both refusals before anything
 * is appended.
 *
 * @returns A `<div>` carrying {@link DEVTOOLS_ROOT_ATTRIBUTE}.
 */
export function createDevToolsRootElement(): HTMLDivElement {
  const element = document.createElement('div');

  element.setAttribute(DEVTOOLS_ROOT_ATTRIBUTE, '');

  return element;
}

/**
 * Mount the dev tools.
 *
 * Appends a `<div data-devtools-root>` to `document.body`, renders the
 * shell into a React root of its own, and asks the dev server and the
 * app's probe what build is running — in parallel, after the first
 * paint.
 *
 * Draws nothing at all under automation without
 * {@link DEVTOOLS_FORCE_ENV_KEY}, or with no configured feature and
 * `showEmpty: false`. Both refusals still answer a disposer.
 *
 * Each call owns its own element and its own root: calling it twice
 * mounts two widgets, and each disposer takes down its own.
 *
 * @param config - What to draw and where to reach the dev server.
 * @returns A disposer that unmounts the root and removes the element.
 * Calling it more than once is harmless.
 */
export function mountDevTools(config: DevToolsConfig): DevToolsDisposer {
  const decision = {
    config,
    automated: isDevToolsAutomated(),
    forced: isDevToolsForced(),
  };

  if (!shouldMountDevTools(decision)) {
    return NOTHING_TO_DISPOSE;
  }

  const element = createDevToolsRootElement();

  document.body.append(element);

  const root: Root = createRoot(element);
  let disposed = false;

  const draw = (status: DevToolsStatus | null, api: string | null): void => {
    // A disposer that ran while a probe was in flight must not be
    // followed by a render into the root it unmounted.
    if (disposed) {
      return;
    }

    root.render(createElement(DevToolsShell, { config, status, api }));
  };

  draw(null, null);

  // Both are total, so neither `Promise.all` nor this call needs a
  // rejection handler: see this module's documentation.
  void Promise.all([
    fetchDevToolsStatus(config),
    resolveDevToolsApiVersion(config),
  ]).then(([status, api]) => {
    draw(status, api);
  });

  return () => {
    if (disposed) {
      return;
    }

    disposed = true;
    root.unmount();
    element.remove();
  };
}
