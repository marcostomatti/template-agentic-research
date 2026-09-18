/**
 * @packageDocumentation
 * The builder: a {@link DevToolsConfig}, the fetched
 * {@link DevToolsStatus} and the shell's current settings in, one
 * {@link DevToolsHost} out.
 *
 * `./types.ts` declares the contract, and this module is the only
 * thing that constructs a value of it. Everything a feature is ever
 * handed was assembled here, so every default the config leaves
 * unstated — the endpoint, the corner, the size, the version line —
 * is applied in this file and nowhere else.
 *
 * Pure and React-free: it reads no storage, holds nothing between
 * calls and mutates neither its input nor the config. The one thing
 * it does reach for is the platform `fetch`, and that is injectable
 * ({@link DevToolsHostInput.fetchImpl}) precisely so the join can be
 * proved without a network.
 *
 * ## The endpoint is a PATH, and both halves are held to it
 *
 * {@link DevToolsHost.endpoint} is a path on the app's own origin,
 * never an origin of its own, and there are two ways that could stop
 * being true. Each has its own guard:
 *
 * - The CONFIG could name one. `endpoint: 'https://example.test/x'`
 *   would make every feature a cross-origin caller and would send the
 *   report bodies somewhere the operator never looked.
 *   {@link normaliseDevToolsEndpoint} refuses it — loudly, at build
 *   time, because a dev tool's operator is the author of the config
 *   and a thrown message at mount is worth more to them than a widget
 *   that silently talks to a stranger.
 * - A PATH could escape it. `host.fetch('../../admin')` resolves above
 *   the endpoint, and `host.fetch('http://example.test/x')` leaves it
 *   entirely. {@link joinDevToolsPath} refuses both, and the refusal
 *   arrives as a REJECTION from {@link DevToolsHost.fetch} rather than
 *   as a synchronous throw, because every caller `await`s it and a
 *   sync throw out of a promise-returning method is caught by nobody.
 *
 * A single leading slash is NOT an escape: `fetch('/report')` and
 * `fetch('report')` both mean the same row under the endpoint. The
 * path is joined ONTO the endpoint, so a leading slash is read as
 * "from the endpoint" rather than as "from the origin" — the second
 * reading would make the natural spelling the escaping one.
 *
 * ## `context()` answers primitives, one level deep, always
 *
 * The record exists to be dropped into a report body or a log line
 * with no walk and no serialiser, so a member that is not a `string`,
 * a finite `number` or a `boolean` is DROPPED rather than serialised,
 * stringified or passed through. That includes a nested object, an
 * array, `null`, `undefined`, a function, a symbol and a `bigint`,
 * and it includes `NaN` and the two infinities — they are numbers to
 * `typeof` but `JSON.stringify` writes them as `null`, so keeping
 * them would break the flatness promise at the one place the record
 * is for.
 *
 * `extra()` is typed to answer primitives already. It is re-checked
 * here anyway because it is app code crossing a boundary, and a
 * JavaScript consumer, a stale build or an `as` cast all reach this
 * function with whatever they like.
 *
 * ## Why a throwing `extra()` is caught here and a throwing feature
 * is not
 *
 * `./menuModel.ts` calls `isEnabled` and `items` bare and lets a
 * throw take the menu build with it, because the operator of a dev
 * tool IS the author of the feature and a stack at the throw site is
 * worth more than a row that quietly vanished.
 *
 * `extra()` is the app's, not the feature's, and it runs at a
 * different moment: while a report is being assembled. A broken
 * context getter must not be the reason a bug report cannot be filed
 * — the report is worth more than the route name it would have
 * carried. So a throw is swallowed and the fixed keys are answered
 * alone, which is exactly the shape a caller already handles.
 *
 * ## `version`: the config first, the status second, `unknown` last
 *
 * An app that bothered to say what build it is knows better than a
 * dev server answering for whatever repository it happens to be
 * serving — see `./types.ts` on why {@link DevToolsConfig.version}
 * exists at all. A blank string is not an answer and falls through to
 * the next source, so `version: { commit: '' }` from a build that had
 * nothing to interpolate does not shadow the server's reading.
 *
 * `api` is not in that chain at all: it comes from
 * {@link DevToolsConfig.apiVersion} or it is `null`. The status
 * payload does not carry it — it is the dev SERVER's reading of the
 * repository, and the API is a third party to both.
 *
 * ## It is a `.ts`, and it imports no React
 *
 * Two-runner discipline: every decision lives in a `.ts` the vitest
 * jsdom project collects and a `.tsx` stays thin. Nothing below
 * touches the DOM either: `URL` and the platform `fetch` are the only
 * globals named, and the second is injectable.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/core/host.test.ts` from `packages/dev-tools` against the 41
 * cases the file holds, and restores this file byte-identical (the
 * harness compared the restored text to the original, every leg):
 *
 * - Changing {@link DEVTOOLS_DEFAULT_ENDPOINT} to `/devtools` answers
 *   `Tests  8 failed | 33 passed (41)` — the whole fetch group plus
 *   two refusals, because the default is what every join case is
 *   written against.
 * - Honouring a leading slash instead of stripping it, so `URL`
 *   resolves `/report` against the ORIGIN, answers `1 failed | 40
 *   passed`: `reads a leading slash as endpoint-relative, never
 *   origin-relative`. It reds as a REFUSAL — the path now escapes —
 *   rather than as a wrong URL, which is the intended failure mode.
 * - Dropping the origin comparison answers `2 failed | 39 passed`:
 *   both doubled-backslash cases. That pair is deliberate. With only
 *   the `\\example.test/x` case written, this same mutation answered
 *   `41 passed` (measured), because its pathname `/x` is caught by
 *   the containment check anyway; the guard was untested and read as
 *   covered. The second case —
 *   `\\example.test/__devtools/report`, whose pathname lands INSIDE
 *   the endpoint — is the one that can only be refused by the origin
 *   comparison.
 * - Dropping the containment check answers `2 failed | 39 passed`:
 *   `../../admin` and the single-backslash path.
 * - Deleting the scheme and protocol-relative refusal at the top of
 *   {@link joinDevToolsPath} answers `2 failed | 39 passed`: the
 *   `http://example.test/x` and `//example.test/x` cases.
 * - Reducing {@link normaliseDevToolsEndpoint}'s legality test to
 *   `segments.length > 0` answers `1 failed | 40 passed`: `refuses to
 *   build when the configured endpoint could resolve out of itself`,
 *   which walks four spellings in one case.
 * - Dropping `Number.isFinite` from the primitive test answers `1
 *   failed | 40 passed`: the `NaN` and infinities case.
 * - Dropping `Array.isArray` from the record test answers `1 failed |
 *   40 passed`: `answers the fixed keys alone when extra() answers no
 *   record`, on the array spelling.
 * - Calling `extra()` outside the try/catch answers `1 failed | 40
 *   passed`: `answers the fixed keys alone when extra() throws`.
 * - Accepting a blank config version — `typeof candidate ===
 *   'string'` alone — answers `1 failed | 40 passed`: `falls through
 *   a blank config value to the status payload`.
 * - Reading the status payload before the config answers `1 failed |
 *   40 passed`: `takes the config value over the status payload`.
 * - Writing `api` into the context record even when it is `null`
 *   answers `4 failed | 37 passed`: `omits the api key when no probe
 *   answered` and the three context refusals, which all read the
 *   whole record.
 * - Merging `extra()` UNDER the fixed keys answers `1 failed | 40
 *   passed`: `lets an app key win over the fixed key of the same
 *   name`.
 * - Capturing `extra()` once at build time answers `1 failed | 40
 *   passed`: `calls extra() per read rather than capturing it once`.
 * - Dropping the `Object.freeze` around the returned host answers `1
 *   failed | 40 passed`: the freeze case.
 *
 * `bun x tsc --noEmit` exits `0` under ALL FIFTEEN of those, measured
 * one by one. Every mutation above is a behaviour change over types
 * that still line up, so `bun run check-types` would never say this
 * builder had changed its mind and the suite is the only gate that
 * reports it.
 */

import type {
  Corner,
  DevToolsBus,
  DevToolsConfig,
  DevToolsHost,
  DevToolsStatus,
  Size,
} from './types';

import { devtoolsBus } from './bus';
import { DEVTOOLS_DEFAULT_SETTINGS } from './settings';

/** Where the dev-server endpoint lives when the config says nothing. */
export const DEVTOOLS_DEFAULT_ENDPOINT = '/__devtools';

/**
 * Where the trigger starts when the config says nothing.
 *
 * Declared here rather than in `./settings.ts` because the corner is
 * deliberately not persisted: it is a CONFIG default this module
 * applies, not a stored value that module reads back.
 */
export const DEVTOOLS_DEFAULT_CORNER: Corner = 'bottom-right';

/** What a version member reads when no source could say. */
export const DEVTOOLS_UNKNOWN_VERSION = 'unknown';

/**
 * The origin every join is resolved against, and never sent to.
 *
 * `.invalid` is reserved by RFC 2606 and resolves nowhere, so a bug
 * that let this string out of {@link joinDevToolsPath} would fail
 * loudly in the network panel rather than reach a real host. The
 * function returns the path alone; this origin only exists because
 * `URL` needs a base to resolve `..` against.
 */
const RESOLUTION_ORIGIN = 'http://devtools.invalid';

/** What each `/`-separated piece of a configured endpoint may hold. */
const ENDPOINT_SEGMENT = /^[A-Za-z0-9._~-]+$/;

/** An absolute URL: a scheme, then a colon. */
const ABSOLUTE_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

/** The two segments that would resolve out of the endpoint. */
const TRAVERSAL_SEGMENTS: readonly string[] = ['.', '..'];

/**
 * How {@link DevToolsHost.fetch} reaches the network.
 *
 * Narrower than the platform signature on purpose: the first argument
 * is the joined path and can only ever be a `string`, so a caller
 * cannot hand a `Request` or a `URL` past the join.
 */
export type DevToolsFetch = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

/** What {@link buildDevToolsHost} takes. */
export interface DevToolsHostInput {
  /** What the app passed to `mountDevTools`. */
  readonly config: DevToolsConfig;

  /**
   * What `GET <endpoint>/status` answered, or `null` before it has.
   *
   * Only the three version members are read here; `persistence` and
   * `gateway` are the menu model's and the shell's.
   */
  readonly status: DevToolsStatus | null;

  /**
   * How the widget is drawn right now.
   *
   * The shell owns this state, so it passes the live values and
   * rebuilds the host when either changes. Omitted — as every case
   * that is not about settings omits it — the config's defaults
   * answer.
   */
  readonly settings?: {
    /** The size in force, read back from storage by the shell. */
    readonly size: Size;

    /** The corner in force; never read back, by requirement. */
    readonly corner: Corner;
  };

  /**
   * What {@link resolveDevToolsApiVersion} answered.
   *
   * Taken already-resolved rather than probed here, so this builder
   * stays synchronous and a host exists before the probe settles.
   *
   * @defaultValue `null`
   */
  readonly api?: string | null;

  /**
   * The pub/sub to hand features.
   *
   * @defaultValue the module-level `devtoolsBus` singleton.
   */
  readonly bus?: DevToolsBus;

  /**
   * How to reach the network.
   *
   * @defaultValue the platform `fetch`.
   */
  readonly fetchImpl?: DevToolsFetch;
}

/** The platform `fetch`, read at call time rather than captured. */
const platformFetch: DevToolsFetch = (url, init) => fetch(url, init);

/**
 * Hold a configured endpoint to a path on the app's own origin.
 *
 * Normalises rather than merely checks: a missing leading slash is
 * added, trailing slashes are dropped, and a blank value answers the
 * default. What it refuses, it refuses by throwing — see this
 * module's documentation for why a misconfigured endpoint is loud.
 *
 * @param endpoint - {@link DevToolsConfig.endpoint}, or `undefined`.
 * @returns A path with a leading and no trailing slash.
 * @throws When the value names an origin, is protocol-relative, or
 * holds a segment that could resolve out of itself.
 */
export function normaliseDevToolsEndpoint(endpoint?: string): string {
  const raw = endpoint === undefined
    ? ''
    : endpoint.trim();

  if (raw === '') {
    return DEVTOOLS_DEFAULT_ENDPOINT;
  }

  if (ABSOLUTE_SCHEME.test(raw) || raw.startsWith('//')) {
    throw new Error(
      `devtools: endpoint ${JSON.stringify(raw)} names an origin. The `
      + 'endpoint is a path on the app\'s own origin, so that every '
      + 'feature stays a same-origin caller.',
    );
  }

  const trimmed = raw.replace(/\/+$/, '');
  const segments = trimmed.split('/').filter((segment) => segment !== '');
  const isLegal = segments.length > 0
    && segments.every((segment) => ENDPOINT_SEGMENT.test(segment))
    && !segments.some((segment) => TRAVERSAL_SEGMENTS.includes(segment));

  if (!isLegal) {
    throw new Error(
      `devtools: endpoint ${JSON.stringify(raw)} is not a plain path. `
      + 'Each segment may hold letters, digits, dot, underscore, tilde '
      + 'and hyphen, and may be neither "." nor "..".',
    );
  }

  return `/${segments.join('/')}`;
}

/**
 * Join a feature's path onto the endpoint.
 *
 * The answer is always a path on the app's own origin, at or below
 * the endpoint. A leading slash on `path` means "from the endpoint",
 * not "from the origin"; a query and a fragment survive.
 *
 * @param endpoint - The endpoint; normalised again, so a caller
 * cannot pass one this module never approved.
 * @param path - What the feature asked for.
 * @returns The joined path, with any query and fragment.
 * @throws When the path names an origin, is protocol-relative, or
 * resolves anywhere other than at or below the endpoint.
 */
export function joinDevToolsPath(endpoint: string, path: string): string {
  const base = normaliseDevToolsEndpoint(endpoint);
  const raw = path.trim();

  if (ABSOLUTE_SCHEME.test(raw) || raw.startsWith('//')) {
    throw new Error(
      `devtools: path ${JSON.stringify(path)} names an origin. A feature `
      + `reaches the dev server through ${base} and nowhere else.`,
    );
  }

  // Leading slashes are dropped rather than honoured: `URL` would
  // resolve `/report` against the ORIGIN, which is the one spelling a
  // feature author is most likely to reach for and the last one that
  // should escape.
  const relative = raw.replace(/^\/+/, '');

  if (relative === '') {
    return base;
  }

  const resolved = new URL(relative, `${RESOLUTION_ORIGIN}${base}/`);

  // Two guards, and the second is not a superset of the first.
  // Measured: `\\example.test/__devtools/report` — two backslashes,
  // which WHATWG maps onto slashes for a special scheme — resolves to
  // origin `http://example.test` with pathname `/__devtools/report`,
  // which the containment check below finds perfectly acceptable.
  // Returning it would silently rewrite a path the feature meant for
  // another host into one on the app's own origin, so it is refused
  // rather than quietly reinterpreted.
  if (resolved.origin !== RESOLUTION_ORIGIN) {
    throw new Error(
      `devtools: path ${JSON.stringify(path)} resolves onto another `
      + `origin. A feature reaches the dev server at or below ${base} `
      + 'and nowhere else.',
    );
  }

  if (
    resolved.pathname !== base
    && !resolved.pathname.startsWith(`${base}/`)
  ) {
    throw new Error(
      `devtools: path ${JSON.stringify(path)} escapes the endpoint `
      + `${base}. A feature reaches the dev server at or below it and `
      + 'nowhere else.',
    );
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

/**
 * Ask the config what version the service is.
 *
 * Total: a config that names no probe, a probe that answers `null`, a
 * probe that answers a blank string, a probe that rejects and a probe
 * that throws synchronously all answer `null`, which reads as
 * "unavailable" wherever the version line is shown and never as an
 * error.
 *
 * @param config - What the app passed to `mountDevTools`.
 * @returns The service version, or `null`.
 */
export async function resolveDevToolsApiVersion(
  config: DevToolsConfig,
): Promise<string | null> {
  if (config.apiVersion === undefined) {
    return null;
  }

  try {
    const answered = await config.apiVersion();

    if (typeof answered !== 'string' || answered.trim() === '') {
      return null;
    }

    return answered;
  } catch {
    // A probe is a network call and the service being down is its
    // ordinary answer, not an incident. The version line says
    // "unavailable" and the widget carries on.
    return null;
  }
}

/**
 * Pick the first source that actually said something.
 *
 * @param configured - What {@link DevToolsConfig.version} carried.
 * @param reported - What the status payload carried.
 * @returns The first non-blank of the two, or
 * {@link DEVTOOLS_UNKNOWN_VERSION}.
 */
function pickVersion(
  configured: string | undefined,
  reported: string | undefined,
): string {
  for (const candidate of [configured, reported]) {
    // A blank string is not an answer: an app whose build had nothing
    // to interpolate leaves `''` behind, and `??` alone would let it
    // shadow the server's reading.
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate;
    }
  }

  return DEVTOOLS_UNKNOWN_VERSION;
}

/**
 * Resolve the version line.
 *
 * @param config - What the app passed to `mountDevTools`.
 * @param status - The status payload, or `null` before one arrived.
 * @param api - What the probe answered.
 * @returns The four members, none of them blank.
 */
function buildVersion(
  config: DevToolsConfig,
  status: DevToolsStatus | null,
  api: string | null,
): DevToolsHost['version'] {
  const configured = config.version;

  return {
    commit: pickVersion(configured?.commit, status?.commit),
    branch: pickVersion(configured?.branch, status?.branch),
    round: pickVersion(configured?.round, status?.round),
    api,
  };
}

/**
 * Whether a member may appear in the flat record.
 *
 * @param member - Whatever the app's `extra()` put under a key.
 * @returns `true` for a string, a boolean or a FINITE number.
 */
function isContextPrimitive(
  member: unknown,
): member is string | number | boolean {
  if (typeof member === 'string' || typeof member === 'boolean') {
    return true;
  }

  // `NaN` and the infinities are numbers to `typeof` and become
  // `null` under `JSON.stringify`, which is not a primitive the
  // contract admits. They are dropped with the nested values.
  return typeof member === 'number' && Number.isFinite(member);
}

/**
 * Whether one `Object.entries` pair may survive the flattening.
 *
 * @param entry - A key and whatever was under it.
 * @returns `true` when the value is a context primitive.
 */
function isContextEntry(
  entry: [string, unknown],
): entry is [string, string | number | boolean] {
  return isContextPrimitive(entry[1]);
}

/**
 * Keep the primitive members of whatever `extra()` answered.
 *
 * `Object.fromEntries` rather than an accumulator that is assigned
 * into: it defines each own property instead of setting it, so a key
 * of `__proto__` lands as data rather than as a prototype swap.
 *
 * @param value - Whatever came back; not trusted to be a record.
 * @returns The primitive members, or nothing at all.
 */
function flattenContext(
  value: unknown,
): Record<string, string | number | boolean> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).filter(isContextEntry));
}

/**
 * Call the app's context getter, and survive it.
 *
 * @param extra - {@link DevToolsConfig.extra}, or `undefined`.
 * @returns Its primitive members, or nothing when it is absent,
 * throws, or answers something that is not a record.
 */
function readExtra(
  extra: DevToolsConfig['extra'],
): Record<string, string | number | boolean> {
  if (extra === undefined) {
    return {};
  }

  try {
    return flattenContext(extra());
  } catch {
    // See this module's documentation: a broken context getter must
    // not be the reason a report cannot be filed.
    return {};
  }
}

/**
 * The keys the host itself contributes to every context read.
 *
 * What the host knows that nothing else does: which build is running
 * and where it is pointed. The environment — viewport, colour scheme,
 * user agent, `location.href` — is the reporting feature's to gather,
 * and duplicating it here would put two readings of the same fact in
 * one record.
 *
 * @param version - The resolved version line.
 * @param endpoint - The normalised endpoint.
 * @returns The fixed keys; `api` only when the probe answered.
 */
function buildFixedContext(
  version: DevToolsHost['version'],
  endpoint: string,
): Record<string, string | number | boolean> {
  const fixed = {
    commit: version.commit,
    branch: version.branch,
    round: version.round,
    endpoint,
  };

  // Omitted rather than written as `null` or as the string
  // "unavailable": the record admits primitives only, and an absent
  // key is the one shape every consumer already handles.
  if (version.api === null) {
    return fixed;
  }

  return { ...fixed, api: version.api };
}

/**
 * Build the one thing a feature may reach.
 *
 * Every default the config left unstated is applied here: the
 * endpoint, the size, the corner, the bus and the version line.
 *
 * Pure: it reads no storage, sends nothing and mutates nothing it was
 * handed. The returned host is frozen, and so are its `version` and
 * `settings`, so a feature cannot edit what the next feature reads.
 * `context()` is the one member that is not a snapshot — it calls
 * {@link DevToolsConfig.extra} per read, because the interesting keys
 * change while the widget stays mounted.
 *
 * @param input - The config, the status payload, and what the shell
 * knows that the config does not.
 * @returns The host.
 * @throws When {@link DevToolsConfig.endpoint} names an origin or is
 * not a plain path.
 */
export function buildDevToolsHost(input: DevToolsHostInput): DevToolsHost {
  const { config } = input;
  const endpoint = normaliseDevToolsEndpoint(config.endpoint);
  const version = Object.freeze(
    buildVersion(config, input.status, input.api ?? null),
  );
  const fixedContext = buildFixedContext(version, endpoint);
  const settings = Object.freeze({
    size: input.settings?.size ?? config.size ?? DEVTOOLS_DEFAULT_SETTINGS.size,
    corner: input.settings?.corner ?? config.corner ?? DEVTOOLS_DEFAULT_CORNER,
  });
  const send = input.fetchImpl ?? platformFetch;

  return Object.freeze({
    version,
    endpoint,
    context: () => ({ ...fixedContext, ...readExtra(config.extra) }),
    settings,
    bus: input.bus ?? devtoolsBus,

    // `async` so a refused path arrives as a rejection: every caller
    // awaits this, and a synchronous throw out of a
    // promise-returning method is caught by nobody.
    async fetch(path: string, init?: RequestInit): Promise<Response> {
      return send(joinDevToolsPath(endpoint, path), init);
    },
  });
}
