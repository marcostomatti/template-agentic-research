/**
 * @packageDocumentation
 * What a report says about the machine it was filed from: the
 * viewport, the device pixel ratio, the colour scheme, the app's
 * `data-theme` when it has set one, the user agent, the current URL,
 * the build the widget was handed, whatever the app puts in its own
 * context getter, the last five failures published on the bus's
 * `error` topic and the current `artefact`.
 *
 * One exported function, {@link collectFeedbackContext}, and a flat
 * record out. `./body.ts` drops that record into the report's
 * Environment table and its fenced `json` block; nothing else in the
 * feature gathers environment facts, so the two readings a report
 * could otherwise disagree about — the widget's and the body
 * builder's — are one reading taken here.
 *
 * ## The record is primitives, one level deep, always
 *
 * Every value that reaches the answer has passed
 * {@link isFeedbackContextValue}: a `string`, a `boolean` or a FINITE
 * `number`, and nothing else. That holds for the keys this module
 * reads itself, for the ones `host.context()` hands over and for
 * every bus payload alike, so a caller can render the record with
 * `String(value)` and serialise it with `JSON.stringify` and be sure
 * neither will meet a nested object, a `null`, a `NaN` or a function.
 *
 * `host.context()` is TYPED to answer primitives and `./core/host.ts`
 * already filters what the app's `extra()` returned, so re-checking
 * it here is not distrust of that module: it is that the promise this
 * module makes covers values from four sources and can only be true
 * if it is enforced at the one place they meet.
 *
 * `Object.fromEntries` rather than an accumulator that is assigned
 * into, for the reason `./core/host.ts` gives: it DEFINES each own
 * property instead of setting it, so an app key called `__proto__`
 * lands as data rather than as a prototype swap.
 *
 * ## What overwrites what
 *
 * The four sources are merged in this order, later winning:
 * environment, then the build, then `host.context()`, then the bus.
 *
 * The app winning over the first two is the reading `./core/host.ts`
 * already takes — its `context()` lets an app key win over the fixed
 * key of the same name — and this module does not reverse it one
 * layer up. The bus last, because its keys are named after the topics
 * they carry and an app that writes `error` in its own `extra()` is
 * saying something about the same subject the `error` topic is for;
 * the published payload is the more recent of the two.
 *
 * ## Five failures, one artefact
 *
 * The `error` topic is read through `recent('error', 5)` and lands as
 * up to five keys — `error` for the newest, then `errorPrevious1` to
 * `errorPrevious4` — while the artefact stays the single `last`
 * reading it has always been. {@link readBus} says why the two topics
 * are read differently and {@link feedbackErrorKey} what a number in
 * a key means. Neither read pads: a bus holding two failures answers
 * two keys, and one holding none answers none.
 *
 * ## What is NOT collected, and why
 *
 * - **No storage, of any kind.** Not the app's `sessionStorage`, not
 *   its `localStorage` keys, not the widget's own
 *   `devtools.settings`. Spec law: only the title, the body and this
 *   context block reach the tracker, and a report that swept up a
 *   session token on its way to a public issue would be the exact
 *   failure that law exists to prevent. `context.test.ts` proves the
 *   absence with a counting stub installed over BOTH storages, and
 *   proves the counter could have moved before it reads it as zero.
 * - **No cookie, no `navigator.credentials`, no API client.** Same
 *   reason, and nothing here imports anything that could reach them.
 * - **The bus's `route` topic.** Spec decision 10 names `error` and
 *   `artefact`, and those two only. The route is already in
 *   `location.href`, and in the app's own `extra()` where it wants to
 *   say more.
 *
 * ## `unknown` is the one word for "nothing could say"
 *
 * {@link DEVTOOLS_UNKNOWN_VERSION} is imported rather than respelt,
 * so the `api` key of a build with no probe and the `colorScheme` of
 * a browser with no `matchMedia` read the same word the host's
 * version line already uses. A report that said `unknown` in one row
 * and `unavailable` in the next would invite the reader to believe
 * the difference meant something.
 *
 * ## It is a `.ts`, and it imports no React
 *
 * Two-runner discipline: every decision lives in a `.ts` the vitest
 * jsdom project collects and a `.tsx` stays thin. This module does
 * touch the DOM — `window`, `document`, `navigator`, `location` — and
 * that is what the jsdom project is for. The drawer that renders the
 * record decides nothing.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/features/feedback/context.test.ts` from `packages/dev-tools`
 * against the 34 cases the file holds, and restores this file
 * byte-identical (the harness compared the restored text to the
 * original, every leg):
 *
 * - Writing the `theme` key unconditionally — `getAttribute(…) ?? ''`
 *   straight into the record — answers `Tests  4 failed | 30 passed
 *   (34)`: the two absent-theme refusals, the key-set pin, and the
 *   body case, which reds because an empty string from the document
 *   element satisfies a `??` that then never asks the body.
 * - Reading `data-theme` off `document.documentElement` alone answers
 *   `1 failed | 33 passed`: `reads a data-theme set on the body when
 *   the element has none`.
 * - Merging the bus keys UNDER `host.context()` answers `1 failed |
 *   33 passed`: `lets a published payload win over an app key of the
 *   same name`.
 * - Merging `host.context()` UNDER the environment keys answers `1
 *   failed | 33 passed`: `lets an app key win over a key this module
 *   read itself`.
 * - Dropping `Number.isFinite` from {@link isFeedbackContextValue}
 *   answers `3 failed | 31 passed`: the non-finite bus number, the
 *   non-finite device pixel ratio, and the smuggled-value case, whose
 *   record carries a `NaN` among its nested members.
 * - Passing every bus payload through without
 *   {@link summariseBusPayload} answers `6 failed | 28 passed`: the
 *   blank payload, the gap case, the ring-wide summary case, the
 *   `Error`, the record and the cap.
 * - Dropping the `JSON.stringify` try/catch answers `1 failed | 33
 *   passed`: `omits a bus payload that cannot be serialised`, which
 *   reds as the cycle's `TypeError` escaping
 *   {@link collectFeedbackContext} rather than as a wrong value.
 * - Dropping the `null`-and-non-finite guard, leaving both to the
 *   serialiser, answers `2 failed | 32 passed`: the `NaN` payload and
 *   the `null` payload, each of which would otherwise be reported as
 *   the four characters `null`.
 * - Removing the length cap answers `2 failed | 32 passed`: `caps a
 *   long bus payload rather than carrying all of it` and `summarises
 *   every error in the ring, not only the newest`, whose oldest
 *   payload is capped too.
 * - Answering `light` rather than {@link DEVTOOLS_UNKNOWN_VERSION}
 *   when `matchMedia` is absent answers `1 failed | 33 passed`:
 *   `answers unknown when the browser cannot say what it prefers`.
 * - Restoring the single `last('error')` read this module used before
 *   the ring existed answers `6 failed | 28 passed`, and those six are
 *   exactly the ring's own cases: the short ring, the sixth-oldest
 *   refusal, the gap, the full key set, the newest-first order and the
 *   ring-wide summary. It is the control for the whole read — every
 *   other case in the file stays green under it, `error` included,
 *   which is what "the existing key set otherwise unchanged" means
 *   here.
 * - Numbering the error keys by their place in the RECORD — summarise,
 *   drop what cannot be reported, then number what is left — answers
 *   `1 failed | 33 passed`: `leaves an unreportable error its own
 *   number rather than closing the gap`, the one case that can tell
 *   the two numberings apart.
 * - Reading `recent('error', 20)` instead of
 *   {@link FEEDBACK_CONTEXT_ERROR_DEPTH} answers `1 failed | 33
 *   passed`: `omits every error older than the fifth`. The depth is
 *   pinned by that case alone, which is why it publishes six.
 *
 * `bun x tsc --noEmit` exits `0` under ALL THIRTEEN, measured one by
 * one: every mutation above is a behaviour change over types that
 * still line up, so `check-types` would never report one and the suite
 * is the only gate that does.
 */

import type { DevToolsBus, DevToolsHost } from '../../core/types';

import { DEVTOOLS_UNKNOWN_VERSION } from '../../core/host';

/** What one member of a collected context may be. */
export type FeedbackContextValue = string | number | boolean;

/** The flat record a report carries about where it was filed from. */
export type FeedbackContext = Record<string, FeedbackContextValue>;

/**
 * How much of one collected value survives into the record.
 *
 * Only the two bus payloads can be long enough to meet this: they are
 * `unknown` by contract, so a serialised artefact could be any size,
 * and the whole record is quoted into an issue body. A capped value
 * ends with {@link FEEDBACK_CONTEXT_ELLIPSIS} so a reader can tell a
 * truncated payload from a short one.
 */
export const FEEDBACK_CONTEXT_VALUE_LIMIT = 500;

/** What marks a value the cap cut short. Plain ASCII, deliberately. */
export const FEEDBACK_CONTEXT_ELLIPSIS = '...';

/**
 * How many `error` payloads a report carries, newest first.
 *
 * Five rather than the twenty the bus keeps: the whole record is
 * quoted into an issue body, each payload is worth up to
 * {@link FEEDBACK_CONTEXT_VALUE_LIMIT} characters there, and a reader
 * triaging one failure reads the few before it — not the whole
 * session. The bus still holds the rest for anything that asks it
 * directly.
 *
 * Not exported: `context.test.ts` spells the five key names out, for
 * the reason `./core/bus.ts` gives about its own cap — a case
 * asserting against this constant would pass for whatever it said.
 */
const FEEDBACK_CONTEXT_ERROR_DEPTH = 5;

/** The key the NEWEST `error` payload is written under. */
const FEEDBACK_CONTEXT_ERROR_KEY = 'error';

/** The attribute the app writes its resolved theme onto. */
const THEME_ATTRIBUTE = 'data-theme';

/**
 * The colour schemes a browser can be asked about, in the order they
 * are asked.
 *
 * `no-preference` is not among them: it is the deprecated third value
 * of `prefers-color-scheme`, and a browser that matches neither of
 * these two has said nothing this module can report — which is what
 * {@link DEVTOOLS_UNKNOWN_VERSION} means.
 */
const COLOR_SCHEMES: readonly string[] = ['dark', 'light'];

/**
 * Whether a value may appear in the flat record.
 *
 * @param value - Whatever a source put under a key.
 * @returns `true` for a string, a boolean or a FINITE number.
 */
function isFeedbackContextValue(value: unknown): value is FeedbackContextValue {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }

  // `NaN` and the infinities are numbers to `typeof` and become
  // `null` under `JSON.stringify`, which would break the flatness
  // promise at the one place the record is for.
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Whether one `Object.entries` pair may survive the merge.
 *
 * @param entry - A key and whatever was under it.
 * @returns `true` when the value is a context primitive.
 */
function isContextEntry(
  entry: [string, unknown],
): entry is [string, FeedbackContextValue] {
  return isFeedbackContextValue(entry[1]);
}

/**
 * Keep the entries of one source that may survive the merge.
 *
 * @param source - The keys one of the four sources offered.
 * @returns Its primitive entries, in their own order.
 */
function contextEntries(
  source: Record<string, unknown>,
): [string, FeedbackContextValue][] {
  return Object.entries(source).filter(isContextEntry);
}

/**
 * Hold one value to {@link FEEDBACK_CONTEXT_VALUE_LIMIT}.
 *
 * @param text - Whatever was about to be written.
 * @returns The text, or its first characters and an ellipsis.
 */
function cap(text: string): string {
  if (text.length <= FEEDBACK_CONTEXT_VALUE_LIMIT) {
    return text;
  }

  const kept = text.slice(0, FEEDBACK_CONTEXT_VALUE_LIMIT);

  return `${kept}${FEEDBACK_CONTEXT_ELLIPSIS}`;
}

/**
 * Reduce one bus payload to a single primitive, or to nothing.
 *
 * The payloads are `unknown` by contract — `./core/types.ts` says why
 * — so this is the one place in the feature that meets a value no
 * type describes. The readings, in order: a blank string is nothing,
 * a primitive is itself, an `Error` is its name and message, a `null`
 * or a non-finite number is nothing, and anything else is its JSON. A
 * value JSON cannot express — a cyclic object, a `bigint`, a
 * function, a symbol — is omitted rather than reported as a broken
 * string, because an absent key is the shape every consumer of this
 * record already handles.
 *
 * An `Error` from another realm — an iframe, a worker — is not an
 * `Error` to `instanceof` and lands as its JSON form, `{}`. Neither
 * producer hands one over: `src/core/globalCapture.ts` flattens what
 * it captured to four primitives before publishing, and the app's
 * bridge is code in the page's own realm.
 *
 * @param payload - What {@link DevToolsBus.last} answered.
 * @returns The value for that key, or `undefined` to omit it.
 */
function summariseBusPayload(payload: unknown): FeedbackContextValue | undefined {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();

    return trimmed === ''
      ? undefined
      : cap(trimmed);
  }

  if (isFeedbackContextValue(payload)) {
    return payload;
  }

  if (payload instanceof Error) {
    return cap(`${payload.name}: ${payload.message}`);
  }

  // A non-finite number and a `null` both have a JSON form — the
  // four characters `null` — and writing that string would report
  // "nothing was published" as a value. Caught here rather than left
  // to the serialiser below, which cannot tell the two apart.
  if (typeof payload === 'number' || payload === null) {
    return undefined;
  }

  try {
    const serialised = JSON.stringify(payload);

    // `undefined`, a function and a symbol all serialise to
    // `undefined` rather than throwing.
    return serialised === undefined
      ? undefined
      : cap(serialised);
  } catch {
    // A cycle or a `bigint`. The report is worth more than the key.
    return undefined;
  }
}

/**
 * What the app has set its theme to, when it has set one.
 *
 * Both elements are asked because `@ar/ui`'s `tokens.css` honours
 * `[data-theme]` on `<html>` OR on `<body>`, and `@ar/web`'s own
 * resolver writes the document element. A blank attribute is read as
 * no answer.
 *
 * @returns The theme, or `undefined` when neither element carries one.
 */
function readTheme(): string | undefined {
  for (const element of [document.documentElement, document.body]) {
    const value = element?.getAttribute(THEME_ATTRIBUTE)?.trim();

    if (value !== undefined && value !== '') {
      return value;
    }
  }

  return undefined;
}

/**
 * Which colour scheme the browser says it prefers.
 *
 * @returns `dark`, `light`, or {@link DEVTOOLS_UNKNOWN_VERSION} when
 * the browser matches neither or cannot be asked at all.
 */
function readColorScheme(): string {
  if (typeof window.matchMedia !== 'function') {
    return DEVTOOLS_UNKNOWN_VERSION;
  }

  const matched = COLOR_SCHEMES.find(
    (scheme) => window.matchMedia(`(prefers-color-scheme: ${scheme})`).matches,
  );

  return matched ?? DEVTOOLS_UNKNOWN_VERSION;
}

/**
 * What the machine and the document can say for themselves.
 *
 * The viewport is rounded: `innerWidth` is fractional under a zoomed
 * or fractionally scaled window, and a report that said `1279.5`
 * would invite a reader to reproduce a width that does not exist.
 *
 * @returns The environment keys; `theme` only when one is set.
 */
function readEnvironment(): Record<string, unknown> {
  return {
    viewportWidth: Math.round(window.innerWidth),
    viewportHeight: Math.round(window.innerHeight),
    devicePixelRatio: window.devicePixelRatio,
    colorScheme: readColorScheme(),
    theme: readTheme(),
    userAgent: navigator.userAgent,
    url: location.href,
  };
}

/**
 * The build the widget was handed, all four members of it.
 *
 * `api` is `string | null` on the host and the record admits no
 * `null`, so a build whose probe answered nothing reads
 * {@link DEVTOOLS_UNKNOWN_VERSION} — the same word `commit`, `branch`
 * and `round` already carry when nothing could say. The key is
 * present either way, which is what lets a reader tell "no probe" from
 * "the key was dropped".
 *
 * @param version - {@link DevToolsHost.version}.
 * @returns The four keys.
 */
function readVersion(version: DevToolsHost['version']): Record<string, unknown> {
  return {
    commit: version.commit,
    branch: version.branch,
    round: version.round,
    api: version.api ?? DEVTOOLS_UNKNOWN_VERSION,
  };
}

/**
 * What one `error` payload is called, by its age.
 *
 * The number is the payload's place in the RING, not its place in the
 * record: a payload {@link summariseBusPayload} cannot report leaves
 * its own number absent and the older ones keep theirs, so
 * `errorPrevious2` is the third-newest failure in every report that
 * carries the key. A record holding `error` and `errorPrevious2` with
 * nothing between them is that case, and renumbering to close the gap
 * would make the older keys lie about which failure they are.
 *
 * @param index - Its position in {@link DevToolsBus.recent}, `0`
 * being the newest.
 * @returns {@link FEEDBACK_CONTEXT_ERROR_KEY} for the newest,
 * `errorPrevious<index>` for every older one.
 */
function feedbackErrorKey(index: number): string {
  return index === 0
    ? FEEDBACK_CONTEXT_ERROR_KEY
    : `${FEEDBACK_CONTEXT_ERROR_KEY}Previous${index}`;
}

/**
 * The last few `error` payloads and the current `artefact`.
 *
 * A bus with nothing published on either topic answers no key at all.
 * That is a normal reading rather than a failure — `./core/bus.ts`
 * says so — and it is why the colocated cases put the empty ring
 * first.
 *
 * The errors go through {@link DevToolsBus.recent} and the artefact
 * through {@link DevToolsBus.last}, which is the difference between
 * the two topics rather than an inconsistency: a report is filed
 * ABOUT one artefact, and the ones looked at before it say nothing
 * about the failure, while the failures before the reported one are
 * often the whole story — a boundary catches the second throw of a
 * render loop and the first is the one worth reading.
 *
 * @param bus - {@link DevToolsHost.bus}.
 * @returns At most {@link FEEDBACK_CONTEXT_ERROR_DEPTH} error keys and
 * the artefact key.
 */
function readBus(bus: DevToolsBus): Record<string, unknown> {
  const errors = bus.recent('error', FEEDBACK_CONTEXT_ERROR_DEPTH);

  return {
    ...Object.fromEntries(errors.map((payload, index) => [
      feedbackErrorKey(index),
      summariseBusPayload(payload),
    ])),
    artefact: summariseBusPayload(bus.last('artefact')),
  };
}

/**
 * Collect everything a report says about where it was filed from.
 *
 * Reads no storage of any kind — see this module's documentation for
 * why that is law rather than an omission — and mutates nothing it is
 * handed. The answer is a fresh object every call: the environment,
 * the colour scheme and the app's own context all change while the
 * drawer stays open, so a caller collects at submit time rather than
 * holding an old reading.
 *
 * @param host - The one surface a feature may reach.
 * @returns The flat record, primitives only.
 */
export function collectFeedbackContext(host: DevToolsHost): FeedbackContext {
  return Object.fromEntries([
    ...contextEntries(readEnvironment()),
    ...contextEntries(readVersion(host.version)),
    ...contextEntries(host.context()),
    ...contextEntries(readBus(host.bus)),
  ]);
}
