/**
 * @packageDocumentation
 * The built web app, served by this service under one fixed prefix.
 *
 * One function, {@link mountWebApp}, and one constant it mounts at,
 * {@link WEB_APP_PREFIX}. What the mount answers, in the order a
 * request meets it:
 *
 * 1. A method other than `GET` or `HEAD` leaves the mount untouched
 *    and meets whatever the host application mounted after it. The
 *    app writes nothing, so nothing under the prefix accepts a body.
 * 2. A scoped `Content-Security-Policy` replaces the app-wide one on
 *    every response the mount answers, refusals included.
 * 3. `express.static` serves a file that exists inside `dir`. A path
 *    naming a dotfile at any depth is refused `403`, a path climbing
 *    out of `dir` is refused `403`, and a malformed escape is refused
 *    `400` — each decided by `send` before it reads the disk.
 * 4. A miss on a path that is NOT asset-shaped answers `index.html`,
 *    so a deep link the client router owns loads the shell. A miss on
 *    an asset-shaped path answers `404`, never the shell: a script
 *    tag handed an HTML page fails with a MIME error that names
 *    nothing, where a `404` names the file.
 *
 * Every refusal is an `AppError` handed on to the error handler the
 * host registers, so it answers the same JSON `{ code, message }`
 * body the rest of the service does and never an HTML page.
 *
 * WHY THE REFUSALS ARE MAPPED HERE AND NOT LEFT TO SERVE-STATIC. With
 * its default `fallthrough: true`, serve-static 2.2.1 turns every
 * error under `500` into a plain `next()` — the dotfile `403` and the
 * traversal `403` included — so a fallback registered after it would
 * answer those two with the shell. The mount runs it with
 * `fallthrough: false` instead, which forwards the error, and maps
 * the status itself.
 */
import type {
  Application,
  ErrorRequestHandler,
  NextFunction,
  RequestHandler,
  Response,
} from 'express';

import { statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';

import express, { Router } from 'express';
import helmet from 'helmet';

import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../lib/errors/index.js';

/**
 * The one path the web app is served under.
 *
 * NOT CONFIGURABLE, ON PURPOSE. Three facts fix it, and a setting
 * could only disagree with them:
 *
 * - The prefix is a property of the BUILD, not of the server. Vite
 *   writes its `base` into every asset URL `index.html` carries at
 *   build time — measured with `--base /app/`, the module script and
 *   the stylesheet are both spelled `/app/assets/...`. A server told
 *   another prefix would answer a shell whose every asset request
 *   lands on a path nothing serves, so the only prefix that works is
 *   the one the artifact was built for.
 * - The web app's own route spellings collide with API routes the
 *   service mounts at `/` — `/settings` and `/sources/:id/failures`
 *   are both. A deep link must answer the shell and the same spelling
 *   from an API client must answer JSON, so the two namespaces need a
 *   prefix between them. A setting would offer `/` as a value, which
 *   is the one mount that breaks both.
 * - A client router, a build flag and this constant spell the prefix
 *   three times. Three constants moved by one edit stay aligned where
 *   a runtime value is free to drift from the other two per
 *   deployment, with nothing reporting it until a browser does.
 */
export const WEB_APP_PREFIX = '/app';

/** The shell every client-routed path answers. */
const INDEX_FILE = 'index.html';

/**
 * The directory Vite writes its content-hashed output to, relative to
 * the build root.
 */
const ASSETS_DIR = 'assets';

/**
 * A content-hashed file name: an eight-character base64url hash
 * before the extension. Measured over a real `packages/web` build,
 * every one of its files under `assets/` matches and `index.html`
 * does not.
 */
const HASHED_NAME = /-[\w-]{8}\.[a-z0-9]+$/i;

/**
 * For a hashed asset. Its name changes whenever its bytes do, so a
 * cached copy is never stale and is never worth revalidating.
 */
const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * For the shell and for any file whose name does not change with
 * its content. A browser keeps the copy and revalidates it on every
 * use, so a deploy reaches the next load rather than a year later.
 */
const NO_CACHE = 'no-cache';

/** What {@link mountWebApp} is handed. */
export type WebAppOptions = {
  /**
   * The web build's output directory. Resolved against the working
   * directory once, at mount time.
   */
  readonly dir: string;
};

/**
 * The `Cache-Control` value for a file the mount serves.
 *
 * Immutable only when BOTH hold: the file sits under `assets/` and
 * its name carries a hash. Either one alone is a guess about a file
 * the build did not name, and the wrong guess pins a stale copy in a
 * browser for a year, where the wrong guess the other way costs one
 * revalidation.
 *
 * @param root - The resolved build root.
 * @param file - The absolute path of the file being served.
 * @returns The header value.
 */
function cacheControlFor(root: string, file: string): string {
  const inAssets = relative(root, file)
    .startsWith(`${ASSETS_DIR}${sep}`);

  return inAssets && HASHED_NAME.test(basename(file))
    ? IMMUTABLE
    : NO_CACHE;
}

/**
 * Whether a path under the prefix names a file rather than a client
 * route.
 *
 * Two shapes: anything under `/assets`, the directory itself
 * included, and a last segment carrying a dot. A client route whose
 * last segment carried a dot would therefore miss the shell; no
 * route the web app declares has one.
 *
 * @param path - The request path with the prefix already stripped.
 * @returns `true` when a miss on it answers `404`.
 */
function isAssetShaped(path: string): boolean {
  if (path === `/${ASSETS_DIR}` || path.startsWith(`/${ASSETS_DIR}/`)) {
    return true;
  }

  return path.slice(path.lastIndexOf('/') + 1)
    .includes('.');
}

/**
 * The HTTP status `send` put on an error, if any.
 *
 * @param err - Whatever reached the error middleware.
 * @returns The numeric `status`, or `undefined` when there is none.
 */
function sendStatusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) {
    return undefined;
  }

  const { status } = err as { status?: unknown };

  return typeof status === 'number'
    ? status
    : undefined;
}

/**
 * Throws unless `root` holds an `index.html` that is a file.
 *
 * At mount time rather than at the first request, so a deployment
 * pointed at an unbuilt or mistyped directory fails its boot instead
 * of answering every deep link with an error.
 *
 * @param root - The resolved build root.
 * @throws Error When `index.html` is absent or is not a file. The
 *   message names the path, which is operator configuration.
 */
function assertIndexPresent(root: string): void {
  const index = join(root, INDEX_FILE);
  const stat = statSync(index, { throwIfNoEntry: false });

  if (stat?.isFile() !== true) {
    throw new Error(
      `mountWebApp: no ${INDEX_FILE} file at ${index}; `
      + 'point it at a built web app',
    );
  }
}

/**
 * Sends the shell.
 *
 * @param res - The response to answer.
 * @param root - The resolved build root.
 * @param next - Where a failure to read the shell goes.
 */
function sendIndex(
  res: Response,
  root: string,
  next: NextFunction,
): void {
  res.sendFile(
    INDEX_FILE,
    {
      root,
      dotfiles: 'deny',
      cacheControl: false,
      headers: { 'Cache-Control': NO_CACHE },
    },
    (err) => {
      if (err) {
        next(err);
      }
    },
  );
}

/**
 * Mounts the built web app at {@link WEB_APP_PREFIX}.
 *
 * @param app - The application to mount on. Where the host places
 *   this call decides which middleware a request under the prefix
 *   meets first; the mount adds no guard of its own.
 * @param options - See {@link WebAppOptions}.
 * @throws Error When `options.dir` holds no `index.html` file.
 *
 * @remarks
 * **The scoped policy.** `script-src 'self'` and
 * `style-src 'self' 'unsafe-inline'` over helmet's defaults — the
 * pair the `/docs` mount carries — measured against a real
 * `packages/web` build with `--base /app/`, over the bundle's text
 * and in Chromium behind this mount:
 *
 * - The built `index.html` carries one module script and one
 *   stylesheet, both same-origin, and no inline script. `'self'` is
 *   enough: the shell renders, and an inline script injected into
 *   the loaded page is blocked and reported, which is the control
 *   saying a violation would have been seen.
 * - One `script-src eval` violation IS reported on every load, and
 *   it is not a need. It is zod 4's feature probe, a bare
 *   `Function('')` inside a `try` that answers `false` when refused,
 *   after which zod parses without compiling. `'unsafe-eval'` would
 *   silence the report and buy nothing the shell uses.
 * - `'unsafe-inline'` IS a need. `react-style-singleton`, which the
 *   dialogs' scroll lock pulls in, appends a `<style>` element with
 *   text content when one opens — a code path read in the bundle,
 *   since the two routes loaded created none. It is what the
 *   app-wide default already carries, so it widens nothing; what the
 *   override drops is that default's `https:` source, the stylesheet
 *   declaring no `url()` and no `@import` at all.
 *
 * **Plain HTTP reaches loopback only.** `useDefaults` keeps helmet's
 * `upgrade-insecure-requests`, as the app-wide header does. Measured
 * in Chromium: over `127.0.0.1` the shell loads; over the same
 * server's LAN address the browser rewrites both asset requests to
 * `https:`, they fail `ERR_SSL_PROTOCOL_ERROR`, and the page stays
 * blank. A deployment reached by anything but loopback serves this
 * mount over TLS.
 */
export function mountWebApp(
  app: Application,
  options: WebAppOptions,
): void {
  const root = resolve(options.dir);

  assertIndexPresent(root);

  const readsOnly: RequestHandler = (req, _res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      next();

      return;
    }

    next('router');
  };

  const answerMiss: ErrorRequestHandler = (err, req, res, next) => {
    const status = sendStatusOf(err);

    if (status === 404 && !isAssetShaped(req.path)) {
      sendIndex(res, root, next);

      return;
    }

    if (status === 404) {
      next(new NotFoundError());

      return;
    }

    if (status === 403) {
      next(new ForbiddenError());

      return;
    }

    if (status === 400) {
      next(new BadRequestError());

      return;
    }

    next(err);
  };

  const router = Router();

  router.use(
    readsOnly,
    helmet.contentSecurityPolicy({
      useDefaults: true,
      directives: {
        scriptSrc: ['\'self\''],
        styleSrc: ['\'self\'', '\'unsafe-inline\''],
      },
    }),
    express.static(root, {
      dotfiles: 'deny',
      fallthrough: false,
      index: false,
      redirect: false,
      setHeaders(res, file) {
        res.setHeader('Cache-Control', cacheControlFor(root, file));
      },
    }),
    answerMiss,
  );

  app.use(WEB_APP_PREFIX, router);
}
