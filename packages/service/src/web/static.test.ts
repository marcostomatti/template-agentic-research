/**
 * What `mountWebApp` answers, driven over supertest against a bare
 * express app holding a temp build directory: an `index.html`, one
 * content-hashed file under `assets/`, one unhashed file at the root,
 * a dotfile, and — OUTSIDE the build directory, beside it — a file a
 * traversal would reach.
 *
 * THE REFUSALS COME FIRST. A dotfile and a climb out of the directory
 * are refused and carry neither the file nor the shell; an
 * asset-shaped miss answers `404` JSON and never the shell; a method
 * other than `GET`/`HEAD`, and any path outside the prefix, leave the
 * mount without the shell; and a directory holding no `index.html`
 * fails the mount itself.
 *
 * THEN THE POSITIVE CASES, which are the controls for the refusals.
 * The same app serves the shell for client routes, the hashed file's
 * bytes, and the unhashed one — so a mount refusing everything, or a
 * fallback answering nothing, reddens a case below rather than
 * passing every case above. The cache split is read both ways, and
 * the scoped policy is read on the mount and held absent beside it.
 *
 * The app registers the framework's own `errorHandler` last, as
 * `createService` does, and a marker handler before it: a request the
 * mount let go answers `418` from that marker, which is what tells
 * "left the mount" apart from "the mount answered 404".
 */
import type { Application } from 'express';

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';

import { mountWebApp, WEB_APP_PREFIX } from './static.js';

const silentLogger = createLogger('web-static-test', { level: 'silent' });

/** The shell's body, unique enough to find in any response. */
const INDEX_MARKER = '<title>ar-web-static-index</title>';

/** The hashed asset's body. */
const ASSET_MARKER = 'console.info("ar-web-static-asset");';

/** The dotfile's body, which no response may carry. */
const DOTFILE_MARKER = 'AR_WEB_STATIC_DOTFILE=1';

/** The body of the file beside the build directory. */
const OUTSIDE_MARKER = 'ar-web-static-outside';

/** A name of the shape Vite gives a content-hashed file. */
const HASHED_ASSET = 'app-AbCd_123.js';

/** What the marker handler after the mount answers with. */
const LEFT_MOUNT = 418;

let tempRoot = '';
let distDir = '';

/**
 * A bare app over `dir`: an open route beside the mount, the mount,
 * the marker a request leaving the mount reaches, and the framework's
 * error handler.
 */
function appOver(dir: string): Application {
  const app = express();

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  mountWebApp(app, { dir });
  app.use((_req, res) => {
    res.status(LEFT_MOUNT).json({ reached: 'after-mount' });
  });
  app.use(errorHandler(silentLogger));

  return app;
}

beforeAll(() => {
  tempRoot = mkdtempSync(join(tmpdir(), 'ar-web-static-'));
  distDir = join(tempRoot, 'dist');
  mkdirSync(join(distDir, 'assets'), { recursive: true });
  writeFileSync(
    join(distDir, 'index.html'),
    `<!doctype html><html><head>${INDEX_MARKER}</head></html>`,
  );
  writeFileSync(join(distDir, 'assets', HASHED_ASSET), ASSET_MARKER);
  writeFileSync(join(distDir, 'robots.txt'), 'User-agent: *');
  writeFileSync(join(distDir, '.env'), DOTFILE_MARKER);
  writeFileSync(join(tempRoot, 'outside.txt'), OUTSIDE_MARKER);
});

afterAll(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('mountWebApp refusals', () => {
  it('refuses a dotfile at any depth with JSON, never the shell', async () => {
    const app = appOver(distDir);

    // The first exists on disk; the second does not. Both are refused
    // before the disk is read, so neither can answer the shell.
    for (const path of ['/app/.env', '/app/.git/config']) {
      const res = await request(app).get(path);

      expect(res.status, path).toBe(403);
      expect(res.type, path).toBe('application/json');
      expect(res.text, path).not.toContain(DOTFILE_MARKER);
      expect(res.text, path).not.toContain(INDEX_MARKER);
    }
  });

  it('refuses a path climbing out of the directory', async () => {
    const app = appOver(distDir);

    // `%2f` survives the client's URL normalization, so the climb
    // reaches the server intact. Normalized, it would be a path
    // outside the prefix and answer the marker's 418 instead.
    for (const path of [
      '/app/..%2foutside.txt',
      '/app/assets/..%2f..%2foutside.txt',
    ]) {
      const res = await request(app).get(path);

      expect(res.status, path).toBe(403);
      expect(res.type, path).toBe('application/json');
      expect(res.text, path).not.toContain(OUTSIDE_MARKER);
      expect(res.text, path).not.toContain(INDEX_MARKER);
    }
  });

  it('refuses a malformed escape with 400', async () => {
    const res = await request(appOver(distDir)).get('/app/%E0%A4%A');

    expect(res.status).toBe(400);
    expect(res.text).not.toContain(INDEX_MARKER);
  });

  it('answers 404 JSON for an asset-shaped miss', async () => {
    const app = appOver(distDir);

    for (const path of [
      '/app/assets/missing-AbCd_123.js',
      '/app/assets/no-extension',
      '/app/assets',
      '/app/missing.png',
    ]) {
      const res = await request(app).get(path);

      expect(res.status, path).toBe(404);
      expect(res.type, path).toBe('application/json');
      expect(res.body, path).toStrictEqual({
        code: 'NOT_FOUND',
        message: 'Not found',
      });
    }
  });

  it('lets a non-GET/HEAD request leave the mount', async () => {
    const app = appOver(distDir);

    for (const method of ['post', 'put', 'delete'] as const) {
      const res = await request(app)[method]('/app/settings');

      expect(res.status, method).toBe(LEFT_MOUNT);
      expect(res.text, method).not.toContain(INDEX_MARKER);
      // The scoped policy belongs to the mount, which this request
      // never entered.
      expect(res.headers['content-security-policy'], method)
        .toBeUndefined();
    }
  });

  it('answers no shell outside the prefix', async () => {
    const app = appOver(distDir);

    for (const path of ['/settings', '/sources/x/failures', '/appx']) {
      const res = await request(app).get(path);

      expect(res.status, path).toBe(LEFT_MOUNT);
      expect(res.text, path).not.toContain(INDEX_MARKER);
    }
  });

  it('throws at mount time when the directory holds no index.html', () => {
    const empty = join(tempRoot, 'empty');
    const indexIsDir = join(tempRoot, 'index-is-dir');

    mkdirSync(empty);
    mkdirSync(join(indexIsDir, 'index.html'), { recursive: true });

    for (const dir of [empty, indexIsDir, join(tempRoot, 'absent')]) {
      expect(() => mountWebApp(express(), { dir }), dir)
        .toThrow(/no index\.html file at /);
    }
    // The control: the built directory mounts.
    expect(() => mountWebApp(express(), { dir: distDir })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------

describe('mountWebApp serving', () => {
  it('mounts at the fixed prefix', () => {
    expect(WEB_APP_PREFIX).toBe('/app');
  });

  it('answers the shell no-cache for every client route', async () => {
    const app = appOver(distDir);

    for (const path of [
      '/app',
      '/app/',
      '/app/settings',
      '/app/sources/x/failures',
      '/app/index.html',
    ]) {
      const res = await request(app).get(path);

      expect(res.status, path).toBe(200);
      expect(res.type, path).toBe('text/html');
      expect(res.text, path).toContain(INDEX_MARKER);
      expect(res.headers['cache-control'], path).toBe('no-cache');
    }
  });

  it('answers the shell to HEAD with no body', async () => {
    const res = await request(appOver(distDir)).head('/app/settings');

    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.text).toBeUndefined();
  });

  it('serves a hashed asset immutable and an unhashed file no-cache', async () => {
    const app = appOver(distDir);

    const hashed = await request(app).get(`/app/assets/${HASHED_ASSET}`);

    expect(hashed.status).toBe(200);
    expect(hashed.text).toBe(ASSET_MARKER);
    expect(hashed.headers['cache-control'])
      .toBe('public, max-age=31536000, immutable');

    const unhashed = await request(app).get('/app/robots.txt');

    expect(unhashed.status).toBe(200);
    expect(unhashed.text).toBe('User-agent: *');
    expect(unhashed.headers['cache-control']).toBe('no-cache');
  });

  it('scopes its policy to the mount', async () => {
    const app = appOver(distDir);

    for (const path of ['/app/', `/app/assets/${HASHED_ASSET}`, '/app/.env']) {
      const res = await request(app).get(path);
      const policy: unknown = res.headers['content-security-policy'];

      expect(typeof policy, path).toBe('string');
      expect(String(policy), path).toContain('script-src \'self\';');
      expect(String(policy), path)
        .toContain('style-src \'self\' \'unsafe-inline\';');
    }

    const health = await request(app).get('/health');

    expect(health.status).toBe(200);
    expect(health.headers['content-security-policy']).toBeUndefined();
  });
});
