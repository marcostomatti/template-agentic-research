/**
 * @packageDocumentation
 * The feedback feature entry of `@ar/dev-tools` — the `./feedback`
 * export, and the whole of what a consuming app reaches of this
 * feature: {@link feedbackFeature}, the options it takes, and the
 * types an app needs to fill the renderer slot.
 *
 * One factory, one {@link DevToolsFeature}, one row. Spec item 3 of
 * `.rafa/specs/q20b-2-feedback-feature.md` fixes the shape — "one
 * drawer item (`placement: 'end'`, `handle: true`)" — and everything
 * the drawer then does lives in the modules beside this file, each of
 * them collected by the jsdom vitest project. This file decides three
 * things and no more: what the row IS, when it is drawn, and what the
 * drawer is handed.
 *
 * ## The one item, and why it is a drawer fixed to `end`
 *
 * A report is written while the page it is about stays visible and
 * interactive: an operator types what is wrong, picks the element it
 * is wrong on, and drops a screenshot of it. A modal would take the
 * top layer and hide the subject; a popover would be dismissed by the
 * first click on the page. `handle: true` is the same requirement one
 * step further on — `./ElementPicker.tsx` COLLAPSES the drawer to
 * start pick mode, and without a handle the collapsed drawer could
 * not be reopened except through the menu.
 *
 * The item's `id` is `report` rather than a namespaced spelling
 * because `src/core/menuModel.ts` namespaces it itself: a node id is
 * `devtools.item.<feature id>.<item id>`, and prefixing here would
 * only repeat the feature's own id inside it.
 *
 * ## Where `module` and `priority` actually go
 *
 * The plan's operator decision is that every widget report files
 * under `--module=web` with NO priority, and that this factory takes
 * both as options. What this file had to decide is the CHANNEL, and
 * the channel is narrower than it looks — measured, by reading the
 * three modules between here and the tracker:
 *
 * - `src/vite/report.ts`'s `devtoolsReportSchema` carries `feature`,
 *   `title`, `body`, `context` and `attachments`, and nothing else. A
 *   `module` sent as a sixth top-level key is STRIPPED by the parse,
 *   so a report that carried one would look sent and arrive without
 *   it.
 * - `./submit.ts`'s `FeedbackReport` is the browser-side spelling of
 *   that same schema, so it cannot carry one either.
 * - `src/vite/gateway/rafa.ts` builds `--module=` and `--priority=`
 *   from `rafaGateway`'s OWN options, and reads nothing off the
 *   stored report to do it.
 *
 * So the one thing that crosses from the browser and reaches the
 * issue is the context record, and that is where this feature writes
 * the two values: {@link FEEDBACK_MODULE_CONTEXT_KEY} always, and
 * {@link FEEDBACK_PRIORITY_CONTEXT_KEY} only when a priority was
 * configured. `./body.ts` puts that record in the report's
 * Environment table and its fenced `json` block, so a triager reads
 * where the report ASKED to be filed even when the dev server it
 * reached was configured differently.
 *
 * The two halves are configured separately and default to the same
 * thing: {@link FEEDBACK_DEFAULT_MODULE} here is `web`, and
 * `rafaGateway`'s `RAFA_DEFAULT_MODULE` is `web` too, with neither
 * emitting a priority by default. A deployment that changes one and
 * not the other gets a body that records the difference rather than a
 * silent disagreement, which is the reason to write the keys at all.
 *
 * ## The drawer is handed a DERIVED host, memoised per host
 *
 * Those two keys can only reach the report through
 * `./context.ts`'s `collectFeedbackContext(host)`, which takes a host
 * and nothing else. So {@link feedbackFeature} hands the drawer a
 * host whose `context()` answers the wrapped host's record with the
 * filing keys merged over it, and leaves every other member as it
 * found it.
 *
 * Two things about that wrapper are load-bearing:
 *
 * - **It is memoised on the host it wraps.** `src/core/Shell.tsx`
 *   calls `item.render({close, host})` during every render of the
 *   shell, so a fresh wrapper per call would be a new
 *   `FeedbackDrawer` `host` prop each time — and the drawer's
 *   template-loading effect is keyed on `[host, store]`, so it would
 *   re-fetch `GET <endpoint>/templates` on every shell render. The
 *   `WeakMap` below keeps one wrapper per host, which is what makes
 *   that effect run once; the host itself is `useMemo`d in the shell,
 *   so the identity it is keyed on is stable there.
 * - **Every member is spelled out rather than spread.** `{...host}`
 *   would copy own enumerable properties only, so a host whose
 *   members sat on a prototype would lose them silently; and a member
 *   ADDED to {@link DevToolsHost} — the one direction the contract
 *   permits growth in — would be missing from the wrapper with
 *   nothing to report it. Spelled out, that addition is a
 *   `check-types` error in this file, which is where the decision to
 *   pass it through belongs.
 *
 * The wrapper's `context()` is a function, not a snapshot: it calls
 * the wrapped host's `context()` per read, because `src/core/host.ts`
 * documents that member as calling the app's `extra()` per read and a
 * wrapper that captured one answer would freeze the app's context at
 * the moment the drawer was first drawn.
 *
 * ## What `isEnabled` can honestly gate on
 *
 * A feature reaches the world through {@link DevToolsHost} alone, and
 * the host says nothing about the dev server's status — no
 * `persistence`, no `gateway`, no template count. The one member that
 * bears on whether a report can go anywhere is
 * {@link DevToolsHost.endpoint}, so that is the gate: a host with a
 * blank endpoint has nowhere to `POST` a report, and the row is not
 * drawn.
 *
 * Under the shell that answer is always `true` — `src/core/host.ts`'s
 * `normaliseDevToolsEndpoint` falls back to `/__devtools` and throws
 * rather than answering `''` — and the gate exists for the two hosts
 * it does not build: one written by hand (a test, a port) and one
 * assembled by a later host implementation.
 *
 * What it deliberately does NOT gate on is the template list. That
 * arrives over the network and `isEnabled` is synchronous, and the
 * drawer already says "this repository has no issue forms" in its own
 * words. A row that disappeared once the answer arrived would be
 * worse than a drawer that explains itself.
 *
 * ## The export list is written out
 *
 * The same rule `src/index.ts` states for the `.` entry, for the same
 * reason: this package is ported to open-tomato as a directory copy,
 * so what is exported here is what the port has to keep working.
 * `export *` would make the surface whatever the sibling modules
 * happen to export today.
 *
 * The types below are the ones an app needs to FILL the renderer
 * slot — `@ar/web`'s adapter over `DynamicForm` is written against
 * exactly these — and nothing else leaves: not the draft store, not
 * the submit calls, not the picker, not the drawer component. A
 * consumer that reached for one of those would be writing a second
 * feedback feature rather than configuring this one.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/features/feedback/index.test.ts` from `packages/dev-tools`
 * against the 24 cases the file holds, and restores this file
 * byte-identical:
 *
 * - Dropping the {@link WeakMap} memo, so a wrapper is built per
 *   `render`, answers `Tests  1 failed | 23 passed (24)`: `hands the
 *   same derived host back for the same host`. That single case is
 *   the whole guard on the drawer's effect not re-fetching per shell
 *   render, which nothing in this package can observe from outside.
 * - Merging the filing keys UNDER the wrapped host's record answers
 *   `1 failed | 23 passed`: `lets the configured module win over an
 *   app key of the same name`.
 * - Writing `priority` unconditionally answers `3 failed | 21
 *   passed`: both blank-priority refusals and `files under the
 *   default module when no option was given`, whose `toStrictEqual`
 *   is what reads the ABSENCE of the key rather than its value.
 * - Reading the module option without trimming, so a blank string is
 *   a module, answers `1 failed | 23 passed`: `files under the
 *   default module when the option is blank`.
 * - Snapshotting `host.context()` once at derive time rather than
 *   calling it per read answers `1 failed | 23 passed`: `reads the
 *   wrapped context per call rather than once`.
 * - Gating `isEnabled` on `endpoint !== ''` without the trim answers
 *   `1 failed | 23 passed`: `refuses a host whose endpoint is
 *   blank`.
 * - Answering `placement: 'start'` answers `1 failed | 23 passed`,
 *   and dropping `handle` answers `1 failed | 23 passed` — the two
 *   halves of the spec's drawer shape, pinned one at a time.
 * - Handing the drawer the bare `host` rather than the wrapper
 *   answers `7 failed | 17 passed`: every case that reads a filing
 *   key off the drawn element's props, plus `leaves every other host
 *   member as it found it`, which reds on the frozen wrapper being
 *   gone rather than on a key.
 *
 * `bun x tsc --noEmit` exits `0` under four of those mutations —
 * the memo (its early return deleted), the merge order, `placement:
 * 'start'` and the unconditional priority (all measured) — so the
 * suite is the only gate that reports any of them.
 *
 * The one direction that runs the other way is the wrapper's spelled
 * out members. Adding a `readonly probe: string` to
 * {@link DevToolsHost} and running `bun x tsc --noEmit` answers six
 * errors across the package, and the one this file is about is
 * `src/features/feedback/index.ts(334,9): error TS2741: Property
 * 'probe' is missing in type 'Readonly<{ version: ... }>' but
 * required in type 'DevToolsHost'.` — the wrapper refusing to drop a
 * member the contract grew. `vitest` reports nothing at all for it.
 */

import type { FeedbackContext } from './context';
import type { ReportFormRenderer } from './types';
import type {
  DevToolsFeature,
  DevToolsHost,
  MenuItem,
  SurfaceProps,
} from '../../core/types';

import { createElement } from 'react';

import { FeedbackDrawer } from './FeedbackDrawer';

/**
 * The id this feature is registered under.
 *
 * Prefixed for the reason every name in this package is: an app's own
 * feature called `feedback` must be able to coexist with this one.
 * The id also travels as the report's `feature` field, which
 * `src/vite/report.ts` validates as an identifier and `src/vite/
 * store.ts` sanitises into a directory name — dots survive both.
 */
export const FEEDBACK_FEATURE_ID = 'devtools.feedback';

/** The id of the one item this feature contributes. */
export const FEEDBACK_ITEM_ID = 'report';

/**
 * What the menu calls the feature itself.
 *
 * Drawn only where a feature has several items, which this one never
 * has — `src/core/menuModel.ts` draws a single-item feature under the
 * ITEM's label. It is still spelled, because the contract requires a
 * label and a blank one would read as a bug the first time a second
 * item existed.
 */
export const FEEDBACK_FEATURE_LABEL = 'Feedback';

/** What the row an operator clicks actually reads. */
export const FEEDBACK_ITEM_LABEL = 'Report feedback';

/**
 * The tracker module a report declares it files under.
 *
 * `web`, per the plan's operator decision, and the same default
 * `rafaGateway` applies on the argv side.
 */
export const FEEDBACK_DEFAULT_MODULE = 'web';

/** The context key carrying {@link FeedbackFeatureOptions.module}. */
export const FEEDBACK_MODULE_CONTEXT_KEY = 'module';

/**
 * The context key carrying {@link FeedbackFeatureOptions.priority}.
 *
 * Absent from the record entirely when no priority is configured,
 * which is the default: rafa then labels the issue `needs-triage`,
 * and a report that claimed a priority nothing put on the argv would
 * be the one shape worse than saying nothing.
 */
export const FEEDBACK_PRIORITY_CONTEXT_KEY = 'priority';

/** What {@link feedbackFeature} takes. Every member is optional. */
export interface FeedbackFeatureOptions {
  /**
   * How to draw a template's fields.
   *
   * @defaultValue `./ReportFormFields.tsx`, the package's plain-HTML
   * renderer, which the drawer falls back to on its own. `@ar/web`
   * passes an adapter over its own `DynamicForm`.
   */
  readonly renderForm?: ReportFormRenderer;

  /**
   * The tracker module a report declares it files under.
   *
   * Blank or absent reads as {@link FEEDBACK_DEFAULT_MODULE}, so an
   * unset environment variable threaded in here gets the default
   * rather than an empty module.
   *
   * @defaultValue `'web'`
   */
  readonly module?: string;

  /**
   * The priority a report declares.
   *
   * Blank or absent means the report declares none at all — see
   * {@link FEEDBACK_PRIORITY_CONTEXT_KEY}.
   *
   * @defaultValue absent
   */
  readonly priority?: string;
}

/**
 * The context keys this feature adds to every report it sends.
 *
 * @param options - What the app configured.
 * @returns A frozen record: the module always, the priority only when
 * one was configured.
 */
function filingContext(options: FeedbackFeatureOptions): FeedbackContext {
  const configured = options.module?.trim() ?? '';
  const priority = options.priority?.trim() ?? '';
  const filed = configured === ''
    ? FEEDBACK_DEFAULT_MODULE
    : configured;
  const keys: FeedbackContext = { [FEEDBACK_MODULE_CONTEXT_KEY]: filed };

  return priority === ''
    ? Object.freeze(keys)
    : Object.freeze({ ...keys, [FEEDBACK_PRIORITY_CONTEXT_KEY]: priority });
}

/**
 * Wrap a host so the report carries the filing keys.
 *
 * Memoised on the host, because the shell calls `render` on every one
 * of its own renders and the drawer's template effect is keyed on the
 * host it is handed — see this module's documentation.
 *
 * @param host - The host the shell handed the surface.
 * @param filing - What {@link filingContext} answered.
 * @param wrapped - The per-feature memo.
 * @returns A frozen host answering the same members, with the filing
 * keys merged over `context()`.
 */
function deriveHost(
  host: DevToolsHost,
  filing: FeedbackContext,
  wrapped: WeakMap<DevToolsHost, DevToolsHost>,
): DevToolsHost {
  const known = wrapped.get(host);

  if (known !== undefined) {
    return known;
  }

  // Spelled member by member rather than spread: a host whose members
  // sit on a prototype keeps them, and a member added to the contract
  // is a `check-types` error here rather than one the drawer loses.
  const derived: DevToolsHost = Object.freeze({
    version: host.version,
    endpoint: host.endpoint,
    context: () => ({ ...host.context(), ...filing }),
    settings: host.settings,
    bus: host.bus,
    fetch: (path: string, init?: RequestInit) => host.fetch(path, init),
  });

  wrapped.set(host, derived);

  return derived;
}

/**
 * Build the feedback feature.
 *
 * One {@link DevToolsFeature} contributing one drawer item, fixed to
 * the `end` edge and leaving a handle behind. It imports no shell
 * state and reaches the world through the {@link DevToolsHost} it is
 * handed, which is the whole of the contract in `src/core/types.ts`.
 *
 * @param options - {@link FeedbackFeatureOptions}; every member
 * optional, so `feedbackFeature()` is the configured default.
 * @returns The feature, frozen. Its rows are a constant: `items` is
 * the same array on every call, and the host it is passed is read by
 * the SURFACE rather than by the row.
 */
export function feedbackFeature(
  options: FeedbackFeatureOptions = {},
): DevToolsFeature {
  const filing = filingContext(options);
  const wrapped = new WeakMap<DevToolsHost, DevToolsHost>();
  const { renderForm } = options;

  const item: MenuItem = {
    id: FEEDBACK_ITEM_ID,
    label: FEEDBACK_ITEM_LABEL,
    mode: 'drawer',
    placement: 'end',
    handle: true,
    render: ({ close, host }: SurfaceProps) => createElement(FeedbackDrawer, {
      host: deriveHost(host, filing, wrapped),
      feature: FEEDBACK_FEATURE_ID,
      close,
      renderForm,
    }),
  };
  const items: readonly MenuItem[] = Object.freeze([item]);

  return Object.freeze({
    id: FEEDBACK_FEATURE_ID,
    label: FEEDBACK_FEATURE_LABEL,

    // The endpoint is the one host member that bears on whether a
    // report has anywhere to go; see this module's documentation for
    // what this deliberately does not ask about.
    isEnabled: (host: DevToolsHost) => host.endpoint.trim() !== '',
    items: () => items,
  });
}

export type {
  ReportCheckboxOption,
  ReportField,
  ReportFieldKind,
  ReportFieldOption,
  ReportTemplate,
} from '../../core/reportTemplate';
export type { FeedbackFieldValue, FeedbackValues } from './body';
export type {
  ReportFormErrors,
  ReportFormField,
  ReportFormRenderer,
} from './types';
