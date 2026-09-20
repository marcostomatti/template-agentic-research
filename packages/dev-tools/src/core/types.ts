/**
 * @packageDocumentation
 * The feature contract: what a dev-tools feature IS, and the one
 * surface it is allowed to reach.
 *
 * `.rafa/specs/q20b-1-dev-tools-shell.md`'s "The feature contract"
 * block is the authority, and this module is that block written as
 * types and nothing else — no shell state, no React element, no
 * storage read and no request sent. `./bus.ts` carries the pub/sub
 * {@link DevToolsBus} names, `./settings.ts` the one storage key, and
 * `./host.ts` the builder that assembles a {@link DevToolsHost} out
 * of a {@link DevToolsConfig} and a {@link DevToolsStatus}; all three
 * are readings OF this contract rather than parts of it.
 *
 * ## {@link DevToolsHost} is the ONLY thing a feature may reach
 *
 * A feature imports no shell state and no other feature, and the
 * shell imports no feature module — features arrive as an array in
 * {@link DevToolsConfig.features}. Everything a feature needs of the
 * world outside itself therefore hangs off the host it is handed: the
 * version line, the endpoint, the context record, the current
 * settings, the bus and a `fetch` already bound to the endpoint.
 *
 * The spec permits ONE direction of growth: a member may be ADDED to
 * {@link DevToolsHost}, and a feature may be given no other way in. So
 * a feature that turns out to need something takes it as a new host
 * member here, never as an import of `../core/Menu` or of a sibling
 * feature — the eslint layering rule refuses the second shape and has
 * nothing to say about the first.
 *
 * ## Why {@link DevToolsConfig.version} exists at all
 *
 * The commit, branch and round normally reach the browser through the
 * Vite plugin's `define`, which rewrites `__DEVTOOLS_COMMIT__` and its
 * two siblings at transform time. `define` rewrites SOURCE the dev
 * server transforms, and a package consumed as a built artefact is not
 * that: when `@ar/dev-tools` is linked into a host app, the app's Vite
 * resolves the `.` export to this package's `dist/index.js`, which
 * `define` never touched. The constants would then be free
 * identifiers at runtime rather than literals, and the About surface
 * would read a `ReferenceError` instead of a commit.
 *
 * So the host app may pass the three facts in directly, as
 * {@link DevToolsConfig.version}, from wherever its own build put them
 * — and that value WINS over the status payload, because an app that
 * bothered to say is more likely right about its own build than a dev
 * server answering for the repository it happens to be serving.
 *
 * ## It is a `.ts`, and it imports no React
 *
 * Two-runner discipline: every decision lives in a `.ts` the vitest
 * jsdom project collects and a `.tsx` stays thin. The one React
 * mention below is `import type { ReactNode }` — erased by
 * `verbatimModuleSyntax` before anything is emitted, so this module
 * still pulls no React into a bundle and still needs no renderer to
 * be tested.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail, and the cases that
 * matter here are `@ts-expect-error` directives, which pass by being
 * NEEDED. Each leg below was measured by breaking this file, reds
 * `bun x tsc --noEmit` from `packages/dev-tools`, and restores this
 * file byte-identical. Exit `2` throughout — tsc's code for a type
 * error, never `1`:
 *
 * - Giving the `'action'` member of {@link MenuItem} a `render` — the
 *   member a flat interface would carry — answers `TS2578: Unused
 *   '@ts-expect-error' directive.` at `types.test.ts(127,7)` and
 *   nothing else. That directive is the pin on "an action draws
 *   nothing".
 * - Moving `placement` onto the `'popover' | 'modal'` member answers
 *   the same `TS2578` at `types.test.ts(162,7)` and nothing else —
 *   the modal literal that expects the refusal.
 * - Deleting `placement` from the `'drawer'` member answers SIX
 *   errors, and the mix is the point: `TS2339: Property 'placement'
 *   does not exist on type '{ ... mode: "drawer"; ... }'` at
 *   `(106,27)`, inside the test's own `drawnAs` — the narrowing being
 *   real rather than asserted — then four `TS2353` at the drawer
 *   literals and one `TS2578` at `(196,5)`. This is the half a
 *   directive cannot measure: it keeps the pair a reading of the
 *   union's SEAM rather than of a contract that refuses `placement`
 *   everywhere.
 * - Flattening the whole union into one interface carrying `run?`,
 *   `render?`, `placement?` and `handle?` answers all three `TS2578`s
 *   at once — `(127,7)`, `(162,7)`, `(196,5)` — and reds NOTHING
 *   else. `drawnAs` survives it, measured: with every member optional
 *   and present, each read still compiles. So the three refusals, and
 *   not the narrowing function, are what make the flat spelling
 *   unreachable.
 *
 * The bus half of this module was measured the same way, and its
 * directives live in the same file:
 *
 * - Widening `'open-item'` in {@link DevToolsBusPayloads} to `unknown`
 *   — the shape the other three topics have — answers exactly three
 *   `TS2578: Unused '@ts-expect-error' directive.` at
 *   `types.test.ts(270,5)`, `(273,5)` and `(279,7)`, and nothing else.
 *   Those three are the payload's whole refusal: a bare string, half
 *   a pair, and a pair carrying a third member. The fourth directive
 *   in that case — the one on a topic outside the roster — stays
 *   NEEDED through this mutation, which is what keeps the two claims
 *   separable.
 * - Deleting the `'open-item'` member outright answers thirteen
 *   errors and no `TS2578` beyond `(279,7)`: `TS2322` on all three
 *   annotated rosters — `types.test.ts(95,3)`, `bus.test.ts(23,3)`
 *   and `bus.ts(212,3)`, each `Type '"open-item"' is not assignable
 *   to type 'keyof DevToolsBusPayloads'` — and `TS2345` at every
 *   publish and subscribe naming the topic. Those `TS2322`s are the
 *   point:
 *   the map is the roster, so the runtime's `TOPICS` and this file's
 *   sweep cannot drift from it in the direction that REMOVES a topic.
 *   Adding a topic to `TOPICS` the map does not declare reds the same
 *   way, measured: a `'nope'` member answers one `TS2322` at
 *   `bus.ts(213,3)`. The other direction — a topic the map declares
 *   and `TOPICS` omits — reds NOTHING here, and `bus.test.ts` is
 *   where it is caught; its mutation note records the two cases.
 *
 * The suite and `check-types` do not report each other's direction,
 * and the false negative runs one way only: `bun x vitest run
 * src/core/types.test.ts` answers `Test Files 1 passed (1)` and
 * `Tests 10 passed (10)` under all four mutations above, each one
 * measured. Vitest strips types rather than checking them, so a
 * directive over code that no longer errs is invisible to it. The
 * runtime readings in each case exist so the file is a test and not
 * a pile of directives; the refusals are `check-types`'s to report,
 * and `bun run test` alone would never say this contract had gone.
 */

import type { ReactNode } from 'react';

/**
 * How a menu item presents itself when it is chosen.
 *
 * Closed at four because the shell draws exactly four things: an
 * `action` runs and draws nothing, a `popover` floats non-modally
 * beside the trigger, a `modal` takes the top layer through
 * `<dialog>.showModal()` and a `drawer` is a fixed panel the page
 * stays interactive behind.
 */
export type SurfaceMode = 'action' | 'popover' | 'modal' | 'drawer';

/**
 * Which edge a drawer is fixed to.
 *
 * `start` and `end` are writing-direction relative rather than
 * left/right, so the panel lands on the same side of the reading order
 * under an RTL document without a second code path.
 */
export type DrawerPlacement = 'start' | 'end' | 'top' | 'bottom';

/**
 * Where the trigger sits.
 *
 * Deliberately not persisted: it resets to the configured default on
 * every load, by requirement. `./settings.ts` is where that asymmetry
 * is written down and why.
 */
export type Corner = 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';

/**
 * How large the trigger is drawn.
 *
 * Persisted, unlike {@link Corner} — an operator who shrank the tomato
 * wants it small on the next load too.
 */
export type Size = 'sm' | 'md' | 'lg';

/**
 * What an `open-item` publish carries.
 *
 * Two ids and nothing else: WHICH feature, and which of that
 * feature's items. Not a {@link MenuItem} and not a callback, because
 * the publisher is the app — outside the widget, holding neither the
 * feature array nor the host — and an id pair is the whole of what it
 * can honestly say. Turning the pair into an item is the shell's job,
 * and it may answer that there is none.
 *
 * Both members are plain `string` rather than a literal union for the
 * same reason: the ids belong to whatever features are plugged in this
 * build, which this module cannot enumerate. So a WELL-TYPED payload
 * naming a feature that is not mounted is an ordinary runtime case
 * rather than a compiler one, and the resolver answers `null` for it.
 */
export interface DevToolsOpenItemPayload {
  /** {@link DevToolsFeature.id} of the feature holding the item. */
  readonly featureId: string;

  /** {@link MenuItem.id}, within that feature's own items. */
  readonly itemId: string;
}

/**
 * Every topic, and what each one carries.
 *
 * The map is the topic roster: {@link DevToolsBusTopic} is its
 * `keyof`, so a topic exists exactly when its payload is declared and
 * neither half can be grown without the other. `./bus.ts`'s `TOPICS`
 * is the runtime's copy of the same roster and must list the same
 * members.
 *
 * Three of the four carry `unknown`, and that is the honest reading
 * rather than a gap. `error`, `route` and `artefact` are announcements
 * the APP makes about itself: their shapes are settled by whatever
 * producer the host app attaches, the widget only ever summarises
 * them, and a shape invented here would be a contract nothing
 * publishes against. `open-item` is the one topic the widget itself
 * consumes and acts on, so it is the one topic that can be — and is —
 * typed.
 *
 * `unknown` is also what keeps the three loose in PRACTICE: because
 * `unknown` accepts every value, a `publish('error', x)` compiles for
 * every `x` exactly as it did before the map existed, and only
 * `open-item` gained a refusal.
 */
export interface DevToolsBusPayloads {
  /** A caught or global failure. Shape settled by the producer. */
  readonly error: unknown;

  /** A navigation. Shape settled by the producer. */
  readonly route: unknown;

  /** Whatever entity the current surface is about. */
  readonly artefact: unknown;

  /** Open one feature's item, as a menu click would. */
  readonly 'open-item': DevToolsOpenItemPayload;
}

/**
 * The four topics the app may tell the widget things on.
 *
 * Closed at four by the spec: `error` for a caught or global failure,
 * `route` for a navigation, `artefact` for whatever entity the current
 * surface is about, and `open-item` for "open this feature's item",
 * which is the one direction that flows back INTO the widget.
 *
 * Derived from {@link DevToolsBusPayloads} rather than written as a
 * second literal union, so a topic can never exist with no declared
 * payload nor a payload with no topic.
 */
export type DevToolsBusTopic = keyof DevToolsBusPayloads;

/**
 * The pub/sub a feature reaches through {@link DevToolsHost.bus}.
 *
 * Declared here rather than in `./bus.ts` for one reason: the host
 * member cannot be typed without it, and the host contract is this
 * module. `./bus.ts` IMPORTS this name — it does not redeclare it —
 * and adds the runtime the contract says nothing about: the
 * `createDevToolsBus()` factory and the module-level `devtoolsBus`
 * singleton.
 *
 * Every member is generic in its topic and reads that topic's payload
 * out of {@link DevToolsBusPayloads}, so what a call may carry is the
 * map's answer rather than a second declaration here. For `error`,
 * `route` and `artefact` the map answers `unknown` and every one of
 * these signatures means exactly what it meant before the map
 * existed; for `open-item` it answers
 * {@link DevToolsOpenItemPayload}, and a publish of anything else
 * does not compile.
 *
 * A typed payload is a claim about the CALLER, not a guarantee about
 * the value: this bus is reached from app code the compiler may never
 * have seen, so a consumer that acts on an `open-item` payload still
 * checks its shape — `./openItem.ts` is where that check lives.
 */
export interface DevToolsBus {
  /**
   * Listen to a topic.
   *
   * @typeParam Topic - Inferred from {@link topic}; picks the payload.
   * @param topic - One of the four topics.
   * @param fn - Called with each published payload.
   * @returns A disposer; calling it more than once is harmless.
   */
  subscribe<Topic extends DevToolsBusTopic>(
    topic: Topic,
    fn: (payload: DevToolsBusPayloads[Topic]) => void,
  ): () => void;

  /**
   * Announce something on a topic.
   *
   * @typeParam Topic - Inferred from {@link topic}; picks the payload.
   * @param topic - One of the four topics.
   * @param payload - Whatever that topic carries: anything at all on
   * the three `unknown` ones, and a
   * {@link DevToolsOpenItemPayload} on `open-item`.
   */
  publish<Topic extends DevToolsBusTopic>(
    topic: Topic,
    payload: DevToolsBusPayloads[Topic],
  ): void;

  /**
   * The most recent payload published on a topic.
   *
   * @typeParam Topic - Inferred from {@link topic}; picks the payload.
   * @param topic - One of the four topics.
   * @returns The last payload, or `undefined` before any publish.
   */
  last<Topic extends DevToolsBusTopic>(
    topic: Topic,
  ): DevToolsBusPayloads[Topic] | undefined;

  /**
   * The payloads recently published on a topic, most recent FIRST.
   *
   * {@link last} answers one payload and this answers a window over
   * the same stream, so `recent(topic, 1)[0]` and `last(topic)` are
   * the same value wherever anything has been published. Both exist
   * because a reader wanting the current state wants the first and a
   * reader wanting what LED here — an error report carrying the last
   * few failures rather than only the newest — wants the second, and
   * spelling the second as repeated `last` reads is impossible: a
   * payload `last` has already been replaced by is gone.
   *
   * The bus keeps at most 20 payloads per topic. That number is the
   * bus's, not the caller's: a request for more than were kept
   * answers what there is, and never pads. So the answer's length is
   * `min(n, published, 20)` and a caller reads the array's own
   * length rather than assuming it got what it asked for.
   *
   * Every answer is a fresh array. A caller may sort or splice it
   * without reaching the bus's own state, and holding one does not
   * make it grow as later payloads arrive — read again for those.
   *
   * @typeParam Topic - Inferred from {@link topic}; picks the payload.
   * @param topic - One of the four topics.
   * @param n - How many to answer, at most. Zero and every negative
   * answer an empty array, which is the same answer an untouched
   * topic gives: "nothing to show" is not an error here and a caller
   * never has to guard the call.
   * @returns Up to `n` payloads, newest first; empty before any
   * publish.
   */
  recent<Topic extends DevToolsBusTopic>(
    topic: Topic,
    n: number,
  ): readonly DevToolsBusPayloads[Topic][];
}

/**
 * What the shell hands a surface it is rendering.
 *
 * The two members are the whole of it: a way to close, and the host.
 * A surface that wants anything else takes it off {@link host} — that
 * is what makes the host the single entry a feature has.
 */
export interface SurfaceProps {
  /** Dismiss this surface. Idempotent; safe after an unmount. */
  close(): void;

  /** The one surface a feature may reach. */
  host: DevToolsHost;
}

/**
 * One row of the dev-tools menu, discriminated on `mode`.
 *
 * ## Why a union and not one interface with optional members
 *
 * The flat spelling — `run?`, `render?`, `placement?`, `handle?` on a
 * single interface — makes `{ mode: 'action', render }` and
 * `{ mode: 'modal' }` both REPRESENTABLE, and there is nothing the
 * shell can do with either: the first names a drawn surface for a mode
 * that draws none, the second an undrawable modal. Discriminated, both
 * are a `check-types` error where somebody wrote them rather than an
 * empty dialog on somebody else's screen. The colocated cases pin the
 * first and the placement seam; the module's mutation note measures
 * what each catches.
 *
 * It also gives the shell narrowing with no cast: `item.mode ===
 * 'drawer'` hands over `placement` and `handle`, and no other member
 * has to be asked whether it has them.
 *
 * ## `placement` and `handle` sit on the drawer member ALONE
 *
 * They are the drawer's, not the contract's. A popover is positioned
 * against the trigger by `@floating-ui/dom` and a modal is centred by
 * the platform, so neither has an edge to be placed against or a
 * collapsed tab to be reopened from. Widening either member to the
 * union would make `{ mode: 'modal', placement: 'end' }` compile and
 * mean nothing.
 */
export type MenuItem =
  | {
    /** Stable identity; the shell keys the open-surface slot on it. */
    id: string;

    /** What the menu row reads. */
    label: string;

    /** Runs and draws nothing. */
    mode: 'action';

    /**
     * Do the thing. The shell shows a pending state while a returned
     * promise is unsettled and reports a rejection in its
     * `role="status"` region.
     *
     * @param host - The one surface a feature may reach.
     */
    run(host: DevToolsHost): void | Promise<void>;
  }
  | {
    /** Stable identity; the shell keys the open-surface slot on it. */
    id: string;

    /** What the menu row reads. */
    label: string;

    /** Floats beside the trigger, or takes the top layer modally. */
    mode: 'popover' | 'modal';

    /**
     * Draw the surface.
     *
     * @param props - A `close` and the host, and nothing else.
     * @returns Whatever the surface shows.
     */
    render(props: SurfaceProps): ReactNode;
  }
  | {
    /** Stable identity; the shell keys the open-surface slot on it. */
    id: string;

    /** What the menu row reads. */
    label: string;

    /** A fixed panel the page stays interactive behind. */
    mode: 'drawer';

    /**
     * Which edge to fix the panel to.
     *
     * @defaultValue the shell's own default; a drawer that says
     * nothing still opens.
     */
    placement?: DrawerPlacement;

    /**
     * Leave a collapsed tab on the drawer's edge once it has been
     * opened, so it can be reopened without the menu.
     *
     * @defaultValue `false`
     */
    handle?: boolean;

    /**
     * Draw the surface.
     *
     * @param props - A `close` and the host, and nothing else.
     * @returns Whatever the surface shows.
     */
    render(props: SurfaceProps): ReactNode;
  };

/**
 * A plugged-in capability: a label, an optional icon, and the menu
 * rows it contributes.
 *
 * A feature imports no shell state and no other feature. The shell
 * never imports a feature module either — features arrive as an array
 * in {@link DevToolsConfig.features} — so the two sides meet at this
 * interface and at {@link DevToolsHost}, and nowhere else.
 */
export interface DevToolsFeature {
  /** Stable identity, distinct across the configured features. */
  readonly id: string;

  /** What the feature is called where the menu names it. */
  readonly label: string;

  /** Optional glyph beside the label. */
  readonly icon?: ReactNode;

  /**
   * Whether this feature is available at all right now.
   *
   * A feature answering `false` contributes no row and no submenu. A
   * feature that omits this is always enabled.
   *
   * @param host - The one surface a feature may reach.
   * @returns `true` to appear in the menu.
   */
  isEnabled?(host: DevToolsHost): boolean;

  /**
   * The rows this feature contributes.
   *
   * One item renders as that row; several render under the feature's
   * own submenu. Answering none is legal and contributes nothing.
   *
   * @param host - The one surface a feature may reach.
   * @returns The rows, in the order they should be drawn.
   */
  items(host: DevToolsHost): readonly MenuItem[];
}

/**
 * The ONE thing a feature may reach.
 *
 * Everything outside a feature arrives through a value of this shape:
 * what build is running, where the dev endpoint is, what the app is
 * currently doing, how the widget is configured, the bus, and a
 * `fetch` already bound to the endpoint. A feature that needs
 * something else gets a new member HERE — the spec permits adding one
 * and permits no other way in.
 *
 * `./host.ts` is the builder. Nothing else constructs one.
 */
export interface DevToolsHost {
  /**
   * What build is running.
   *
   * `commit`, `branch` and `round` read `unknown` when nothing could
   * say — a checkout that is not a git repository, or a linked build
   * `define` never reached (see this module's header). `api` is the
   * service's version, or `null` when the config named no probe or
   * the probe answered nothing.
   */
  readonly version: {
    commit: string;
    branch: string;
    round: string;
    api: string | null;
  };

  /**
   * Where the dev-server endpoint lives.
   *
   * A path, never an origin: `fetch` joins onto it, and a value that
   * opened onto another host would make every feature a cross-origin
   * caller.
   */
  readonly endpoint: string;

  /**
   * What the app is doing right now, flattened.
   *
   * Primitives only, one level deep, so a feature can drop the record
   * into a report body or a log line with no walk and no serialiser.
   *
   * @returns The merged fixed and app-supplied keys.
   */
  context(): Record<string, string | number | boolean>;

  /**
   * How the widget is currently drawn.
   *
   * `size` is read back from storage; `corner` is not persisted and
   * holds the configured default until something moves it this load.
   */
  readonly settings: { size: Size; corner: Corner };

  /** The pub/sub. Window captures reach `error`; the app settles the rest. */
  readonly bus: DevToolsBus;

  /**
   * Call the dev-server endpoint.
   *
   * @param path - Joined onto {@link endpoint}, never onto an origin.
   * @param init - Passed through to the platform `fetch`.
   * @returns The response, unread.
   */
  fetch(path: string, init?: RequestInit): Promise<Response>;
}

/**
 * What the dev-server endpoint answers at `GET <endpoint>/status`.
 *
 * It is the SERVER's reading, and it loses to
 * {@link DevToolsConfig.version} wherever the two disagree — an app
 * that bothered to say what build it is knows better than a dev server
 * answering for whatever repository it happens to be serving.
 */
export interface DevToolsStatus {
  /** `HEAD` at dev-server start, or `unknown` outside a repository. */
  readonly commit: string;

  /** The checked-out branch, or `unknown` outside a repository. */
  readonly branch: string;

  /** The round tag reports are filed under. */
  readonly round: string;

  /**
   * Whether the server can persist the widget's settings for this
   * operator.
   *
   * The menu's "Save settings" row is drawn only when this is `true`.
   * This plan's plugin always answers `false`: the row and its wire
   * exist, the behaviour is deferred.
   */
  readonly persistence: boolean;

  /**
   * The configured report gateway's name, or `'none'`.
   *
   * `'none'` is this plan's only answer — the gateway interface is
   * declared with no implementation.
   */
  readonly gateway: string;
}

/**
 * What `mountDevTools` takes.
 *
 * Only {@link features} is required, so an app that wants the shell
 * and nothing configured passes one key. Every other member narrows a
 * default the shell already holds.
 */
export interface DevToolsConfig {
  /**
   * Where the trigger starts, every load.
   *
   * Not persisted, by requirement: an operator who dragged the tomato
   * out of the way last week still gets it here today.
   *
   * @defaultValue `'bottom-right'`
   */
  readonly corner?: Corner;

  /**
   * How large to draw the trigger when nothing is stored yet.
   *
   * Unlike {@link corner}, a size the operator picks DOES persist and
   * wins over this on the next load.
   *
   * @defaultValue `'md'`
   */
  readonly size?: Size;

  /**
   * Where the dev-server endpoint lives.
   *
   * @defaultValue `'/__devtools'`
   */
  readonly endpoint?: string;

  /**
   * The plugged-in features, in menu order.
   *
   * The one required member, and `readonly` because the shell reads it
   * on every menu open and must not be the thing that reorders it.
   * Empty is legal: see {@link showEmpty}.
   */
  readonly features: readonly DevToolsFeature[];

  /**
   * App-supplied context keys, merged over the fixed ones.
   *
   * Called per read rather than captured once, because the interesting
   * keys — the current route, the data source in use — change while
   * the widget stays mounted. A nested value is dropped rather than
   * serialised: {@link DevToolsHost.context} answers primitives only.
   *
   * @returns Whatever the app wants a report to carry.
   */
  extra?(): Record<string, string | number | boolean>;

  /**
   * Ask the service what version it is.
   *
   * Asynchronous because it is a probe over the network. Answering
   * `null` — or omitting this entirely — reads as "unavailable"
   * wherever the version line is shown, never as an error.
   *
   * @returns The service version, or `null`.
   */
  apiVersion?(): Promise<string | null>;

  /**
   * The build facts, when the app can say them better than the server.
   *
   * This exists because `define` may not reach a linked package's
   * `dist/`: the plugin rewrites `__DEVTOOLS_COMMIT__` and its
   * siblings in SOURCE it transforms, and a `@ar/dev-tools` resolved
   * to its built `dist/index.js` was never transformed, so the
   * constants would be free identifiers at runtime rather than
   * literals. An app that knows its own build passes the facts here
   * and they WIN over {@link DevToolsStatus}; `api` is not among them
   * because it comes from {@link apiVersion} alone.
   *
   * Partial on purpose — an app that knows only its commit says only
   * that, and the rest falls back to the status payload and then to
   * `unknown`.
   */
  readonly version?: Partial<Omit<DevToolsHost['version'], 'api'>>;

  /**
   * Whether to mount with no enabled feature.
   *
   * `true` — the default — mounts the shell on its own: the trigger,
   * Position, About and the settings row are the widget's own and are
   * worth having before any feature exists. An app that wants the
   * tomato to appear only once something plugs in passes `false`, and
   * then an empty {@link features} means nothing is appended to the
   * document at all.
   *
   * @defaultValue `true`
   */
  readonly showEmpty?: boolean;
}
