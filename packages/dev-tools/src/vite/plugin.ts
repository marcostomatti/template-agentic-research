/**
 * The Vite plugin itself, and the one module in this package that names
 * the real filesystem, the real clock and the real `git`.
 *
 * Spec item 8 is the authority, and decision 7 is why it is shaped this
 * way: the plugin "registers in `serve` only and files nothing. It
 * answers status, defines the build-time constants, validates and
 * stores reports on disk. What happens to a stored report is q20b-2's
 * business, behind an injected gateway."
 *
 * Two functions, and the split between them is the test seam:
 *
 * - {@link assembleDevTools} takes the filesystem, the clock, the
 *   command runner and the environment as {@link DevToolsPluginDeps} and
 *   reaches for none of them itself. It resolves the three build values
 *   once, answers spec item 8.1's `define` map, and builds the
 *   middleware through `./endpoint.ts`.
 * - {@link devtoolsPlugin} resolves the real world — `node:fs/promises`,
 *   `Date`, `spawnSync`, `process.env` — calls
 *   {@link assembleDevTools} once, and hands the `define` map to Vite's
 *   `config()` hook and the middleware to `server.middlewares`. It does
 *   nothing else.
 *
 * So the colocated suite drives the assembled middleware with an
 * in-memory filesystem, a clock that never moves and a scripted runner:
 * it spawns nothing, writes nothing anywhere, and every timestamp in
 * every asserted path is exact.
 *
 * ## `apply: 'serve'` is the whole of the production story
 *
 * Vite filters plugins by `apply` BEFORE it runs a hook, so under `vite
 * build` this plugin's `config()` never runs, the three defines do not
 * exist and neither endpoint is registered. That is why
 * `packages/web/src/dev/devtools.ts` reads `__DEVTOOLS_COMMIT__`,
 * `__DEVTOOLS_BRANCH__` and `__DEVTOOLS_ROUND__` behind `typeof` guards
 * rather than as plain identifiers: an unguarded read would be a
 * `ReferenceError` in a built app rather than a missing version line.
 *
 * ## `persistence` is always false in this plan
 *
 * `GET /__devtools/status` answers `persistence: false` unconditionally,
 * and no option here changes it. The item it gates — the menu's "Save
 * settings" row — exists, with its behaviour deferred;
 * `./endpoint.ts`'s `createDevToolsEndpoint` carries the full reading,
 * beside the payload that states it.
 *
 * ## Where the round comes from, and why only once
 *
 * Three sources, in this precedence: `devtoolsPlugin({round})`, then
 * `VITE_DEVTOOLS_ROUND`, then the git branch — the first because it is
 * the most deliberate, the other two in the order `./git.ts` already
 * resolves them. Every one of them is sanitised to `[a-z0-9-]` through
 * `./store.ts`'s `sanitiseSegment`, and a stated round that sanitises
 * to nothing falls through as though it had not been stated.
 *
 * {@link assembleDevTools} resolves it ONCE, and both the
 * `__DEVTOOLS_ROUND__` the browser is told and the round that names the
 * directory on disk are that one string, so the About panel and the
 * feedback folder cannot drift.
 *
 * ## Nothing here can run a program other than `git`
 *
 * {@link runGit} is handed an argv ARRAY, with `shell: false`, and
 * `./git.ts`'s runner type takes the ARGUMENTS only — never a program
 * name — so neither a plugin option nor a request body can reach the
 * process it spawns. The three argument vectors it is ever called with
 * are the three frozen constants in `./git.ts`.
 *
 * ## Mutation note
 *
 * There is none yet, honestly: `src/vite/plugin.test.ts` is the NEXT
 * task in this stage, and a mutation reading is a measurement against a
 * colocated suite that does not exist while this file is written. The
 * gates run for this task were `lint`, `check-types`, `test` and
 * `build` inside `packages/dev-tools`, and `test` collected the four
 * sibling suites under `src/vite/` and no case over this file or over
 * `./endpoint.ts`. The suite's task is what adds the legs: the five
 * refusals in spec item 8.5's order, the status payload, a stored report
 * with its attachments on disk, a configured gateway receiving the
 * stored path, and `apply === 'serve'`.
 */

import type { DevToolsEndpointContext, DevToolsMiddleware } from './endpoint';
import type { ReportGateway } from './gateway';
import type { DevToolsBuildInfo, DevToolsCommandRunner } from './git';
import type { DevToolsClock, DevToolsStoreFs } from './store';
import type { Plugin } from 'vite';

import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

import { createDevToolsEndpoint } from './endpoint';
import { resolveDevToolsBuildInfo } from './git';
import { DEVTOOLS_DEFAULT_OUT_DIR, sanitiseSegment } from './store';

/** The plugin's name in Vite's plugin list, `devtools`-prefixed. */
export const DEVTOOLS_PLUGIN_NAME = 'devtools';

/** Spec item 8.1's commit define. */
export const DEVTOOLS_COMMIT_DEFINE = '__DEVTOOLS_COMMIT__';

/** Spec item 8.1's branch define. */
export const DEVTOOLS_BRANCH_DEFINE = '__DEVTOOLS_BRANCH__';

/** Spec item 9's round define. */
export const DEVTOOLS_ROUND_DEFINE = '__DEVTOOLS_ROUND__';

/**
 * The environment variable that turns `allowLan` on without editing a
 * config file — spec item 12's env table names it.
 *
 * Deliberately NOT `VITE_`-prefixed: Vite exposes only `VITE_`
 * variables to the browser bundle, and whether the endpoint answers the
 * LAN is no business of the page's.
 */
export const DEVTOOLS_ALLOW_LAN_ENV_NAME = 'DEVTOOLS_ALLOW_LAN';

/** What {@link DEVTOOLS_ALLOW_LAN_ENV_NAME} may be set to for `true`. */
const TRUTHY_ENV_VALUES: ReadonlySet<string> = new Set([
  '1',
  'true',
  'yes',
  'on',
]);

/** The longest sanitised round an option may state. */
const ROUND_MAX = 64;

/** How long a `git` read may take before it is abandoned. */
const GIT_TIMEOUT_MS = 5_000;

/** The most stdout a `git` read may produce. */
const GIT_MAX_BUFFER = 1024 * 1024;

/** What {@link devtoolsPlugin} takes — spec item 8's four options. */
export interface DevToolsPluginOptions {
  /**
   * The round tag, which names the directory reports land in.
   *
   * Wins over `VITE_DEVTOOLS_ROUND` and over the branch. Sanitised to
   * `[a-z0-9-]` before anything sees it, and ignored when nothing
   * survives that.
   */
  readonly round?: string;

  /**
   * Accept reports from addresses that are not loopback.
   *
   * What an operator testing from a phone on the same network asks for.
   * Defaults to whether {@link DEVTOOLS_ALLOW_LAN_ENV_NAME} is set to a
   * truthy value; stating it here either way wins over the environment,
   * so `allowLan: false` in a config file cannot be reopened by a
   * variable in a shell.
   */
  readonly allowLan?: boolean;

  /**
   * Where the round directory is created, defaulting to
   * {@link DEVTOOLS_DEFAULT_OUT_DIR}.
   */
  readonly outDir?: string;

  /**
   * Where a stored report goes next.
   *
   * This plan ships no implementation — `./gateway.ts` declares the
   * interface and q20b-2 fills it in — so leaving this out is the
   * normal case, and it makes `GET /__devtools/status` answer
   * `gateway: 'none'`.
   */
  readonly gateway?: ReportGateway;
}

/** The things {@link assembleDevTools} will not reach for. */
export interface DevToolsPluginDeps {
  /** The filesystem `./store.ts` writes through. */
  readonly fs: DevToolsStoreFs;

  /** The clock `./store.ts` timestamps with. */
  readonly now: DevToolsClock;

  /** The runner `./git.ts` reads `git` through. */
  readonly run: DevToolsCommandRunner;

  /** The environment the round and `allowLan` may come from. */
  readonly env: Readonly<Record<string, string | undefined>>;

  /**
   * The scheme the dev server answers on, defaulting to `http:`.
   *
   * Only ever `https:` when the consuming config sets `server.https`.
   * The PORT is not a dep — `./endpoint.ts` reads it off the accepted
   * connection, and its header says why.
   */
  readonly protocol?: 'http:' | 'https:';

  /** Where a refusal is logged; see {@link DevToolsEndpointContext}. */
  readonly log?: (message: string) => void;
}

/** What {@link assembleDevTools} answers. */
export interface DevToolsAssembly {
  /** The three values, resolved once. */
  readonly info: DevToolsBuildInfo;

  /** Spec item 8.1's three defines, each already JSON-encoded. */
  readonly define: Readonly<Record<string, string>>;

  /** The middleware answering both endpoints. */
  readonly handler: DevToolsMiddleware;
}

/**
 * Is {@link DEVTOOLS_ALLOW_LAN_ENV_NAME} set to something meaning yes.
 *
 * @param env - The environment to read.
 * @returns Whether the LAN is allowed by the environment alone.
 */
function allowLanFromEnv(
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  const stated = env[DEVTOOLS_ALLOW_LAN_ENV_NAME];

  if (stated === undefined) {
    return false;
  }

  return TRUTHY_ENV_VALUES.has(stated.trim().toLowerCase());
}

/**
 * Resolve the three build values, applying the `round` option.
 *
 * @param options - The plugin's options.
 * @param deps - The command runner and the environment.
 * @returns The build info the defines and the status payload both use.
 */
function buildInfoOf(
  options: DevToolsPluginOptions,
  deps: DevToolsPluginDeps,
): DevToolsBuildInfo {
  const resolved = resolveDevToolsBuildInfo({ run: deps.run, env: deps.env });
  const stated = sanitiseSegment(options.round ?? '', ROUND_MAX);

  return Object.freeze({
    commit: resolved.commit,
    branch: resolved.branch,
    round: stated === ''
      ? resolved.round
      : stated,
  });
}

/**
 * Assemble the defines and the middleware over injected dependencies.
 *
 * Runs the `git` reads once, here. The middleware it answers holds no
 * mutable state, so one assembly serves every request of a dev-server
 * session.
 *
 * @param options - The plugin's four options.
 * @param deps - The filesystem, the clock, the command runner, the
 * environment, and optionally the scheme and a log sink.
 * @returns The resolved build info, the define map and the middleware.
 */
export function assembleDevTools(
  options: DevToolsPluginOptions,
  deps: DevToolsPluginDeps,
): DevToolsAssembly {
  const info = buildInfoOf(options, deps);

  const context: DevToolsEndpointContext = {
    info,
    outDir: options.outDir ?? DEVTOOLS_DEFAULT_OUT_DIR,
    allowLan: options.allowLan ?? allowLanFromEnv(deps.env),
    protocol: deps.protocol ?? 'http:',
    gateway: options.gateway,
    fs: deps.fs,
    now: deps.now,
    log: deps.log,
  };

  return Object.freeze({
    info,
    define: Object.freeze({
      [DEVTOOLS_COMMIT_DEFINE]: JSON.stringify(info.commit),
      [DEVTOOLS_BRANCH_DEFINE]: JSON.stringify(info.branch),
      [DEVTOOLS_ROUND_DEFINE]: JSON.stringify(info.round),
    }),
    handler: createDevToolsEndpoint(context),
  });
}

/** The real filesystem, which `./store.ts`'s seam is shaped after. */
const NODE_FS: DevToolsStoreFs = { mkdir, writeFile };

/** The real clock. */
const NODE_CLOCK: DevToolsClock = () => new Date();

/**
 * The real `git`, run with an argv array and no shell.
 *
 * The one place in this package that spawns a process. Synchronous
 * because `./git.ts`'s header says why: three values, read once, every
 * caller needing all three before it can define anything.
 *
 * @param args - The arguments `./git.ts` asked for, never a program.
 * @returns What the command answered. A non-zero exit, a `git` that is
 * not on the `PATH`, a timeout and a throw are all `{ok: false}`, and
 * nothing throws out of here.
 */
const runGit: DevToolsCommandRunner = (args) => {
  try {
    const outcome = spawnSync('git', [...args], {
      encoding: 'utf8',
      maxBuffer: GIT_MAX_BUFFER,
      shell: false,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
    });

    if (outcome.error !== undefined || outcome.status !== 0) {
      return { ok: false };
    }

    if (typeof outcome.stdout !== 'string') {
      return { ok: false };
    }

    return { ok: true, stdout: outcome.stdout };
  } catch {
    return { ok: false };
  }
};

/**
 * The dev-server plugin: spec item 8, assembled over the real world.
 *
 * Registers for `serve` alone, so `vite build` runs none of it and a
 * built app carries neither the endpoints nor the three defines.
 *
 * @param options - The round, `allowLan`, the output directory and the
 * gateway, all optional.
 * @returns The Vite plugin.
 */
export function devtoolsPlugin(options: DevToolsPluginOptions = {}): Plugin {
  let assembly: DevToolsAssembly | null = null;
  let log = (message: string): void => {
    // Until `configureServer` runs there is no Vite logger to route
    // through, and a refusal before then would otherwise be silent.
    console.warn(message);
  };

  /**
   * Assemble once, in whichever hook needs it first.
   *
   * `config()` always runs before `configureServer` in a real Vite run,
   * so the scheme is read there; the `??=` is what holds the `git` reads
   * and the round to one resolution per dev-server start.
   *
   * @param https - Whether the dev server was configured for TLS.
   * @returns The assembly.
   */
  const ensure = (https: boolean): DevToolsAssembly => {
    assembly ??= assembleDevTools(options, {
      fs: NODE_FS,
      now: NODE_CLOCK,
      run: runGit,
      env: process.env,
      protocol: https
        ? 'https:'
        : 'http:',
      // Wrapped rather than passed, because `configureServer` replaces
      // the sink after the assembly has already closed over it.
      log: (message) => {
        log(message);
      },
    });

    return assembly;
  };

  return {
    name: DEVTOOLS_PLUGIN_NAME,
    apply: 'serve',

    config(userConfig) {
      return {
        define: { ...ensure(userConfig.server?.https !== undefined).define },
      };
    },

    configureServer(server) {
      log = (message) => {
        server.config.logger.warn(message);
      };

      const { handler } = ensure(server.config.server.https !== undefined);

      server.middlewares.use(handler);
    },
  };
}
