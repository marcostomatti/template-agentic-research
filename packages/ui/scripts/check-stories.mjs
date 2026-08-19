#!/usr/bin/env node
/**
 * Story doctor — loads every story of a built Storybook in headless Chromium
 * and fails if any story logs a console error, throws a page error, or shows
 * the Storybook error overlay. This is the "does the preview actually work
 * for users" gate that headless vitest smoke tests cannot see (they run
 * stories through a different pipeline).
 *
 * Usage:
 *   bun run build:storybook
 *   node scripts/check-stories.mjs [staticDir=storybook-static] [port=6007]
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

import { chromium } from 'playwright';

const staticDir = resolve(process.argv[2] ?? 'storybook-static');
const port = Number(process.argv[3] ?? 6007);

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = join(staticDir, path === '/' ? 'index.html' : path);
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((ok) => server.listen(port, ok));

const index = JSON.parse(await readFile(join(staticDir, 'index.json'), 'utf8'));
const storyIds = Object.values(index.entries)
  .filter((e) => e.type === 'story')
  .map((e) => e.id);

const browser = await chromium.launch();
const page = await browser.newPage();

const failures = [];
for (const id of storyIds) {
  const errors = [];
  const onConsole = (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().split('\n')[0].slice(0, 200));
  };
  const onPageError = (err) => errors.push(`pageerror: ${String(err).split('\n')[0].slice(0, 200)}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(300);

  const overlayVisible = await page
    .locator('.sb-show-errordisplay')
    .isVisible()
    .catch(() => false);
  if (overlayVisible) errors.push('storybook error overlay is visible');

  page.off('console', onConsole);
  page.off('pageerror', onPageError);

  if (errors.length) {
    failures.push({ id, errors });
    console.log(`✗ ${id}\n    ${errors.join('\n    ')}`);
  } else {
    console.log(`✓ ${id}`);
  }
}

await browser.close();
server.close();

console.log(`\n${storyIds.length - failures.length}/${storyIds.length} stories render clean`);
if (failures.length) {
  console.error(`${failures.length} storie(s) have preview errors`);
  process.exit(1);
}
