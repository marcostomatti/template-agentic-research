#!/usr/bin/env node
/**
 * Rosetta-stone comparator — captures a Storybook story and the matching
 * design demo side by side, so a human (or Claude) can verify the
 * translation is 1:1 before trusting visual baselines.
 *
 *   node scripts/compare-design.mjs <story-id> <SpecName> [options]
 *
 *   <story-id>   Storybook id, e.g. atoms-button--primary
 *   <SpecName>   bundle mode: the spec's name — matches the #prim-<SpecName>
 *                anchor in Component-Breakdown.html (Button, Touchable, …)
 *                auth mode: the artboard TITLE in auth.html, quoted
 *                (e.g. "Default state", "OAuth confirm — GitHub")
 *                topbar mode: the showcase CARD title in topbar.html, quoted
 *                (e.g. "Search suggest", "Workspace switcher")
 *                dashboard mode: the raw-DS PAGE file to serve
 *                (e.g. usage.html, agents.html, settings.html)
 *   --source bundle|auth|topbar|dashboard  design side source (default
 *                bundle). Design references live under design/ — see
 *                design/README.md for the expected file contract:
 *                bundle → design/bundle/index.html
 *                auth   → design/pages/auth.html (screens render at
 *                         85% inside artboards; the scale is neutralized so
 *                         the capture is full-size)
 *                topbar → design/pages/topbar.html — captures one
 *                         showcase card's demo box (its .check-bg body) by
 *                         card title; --selector narrows within the card
 *                dashboard → design/pages/<SpecName> full page —
 *                         these are whole-app screens, not artboards, so
 *                         capture is full-page by default; use --selector to
 *                         crop a region (inline styles only — no ids, so
 *                         find a structural selector via devtools first)
 *   --theme light|dark   theme for BOTH captures (default light)
 *   --set key=value      bundle mode only: click the demo's segmented
 *                        control <key> to <value> before capturing
 *   --selector <css>     bundle: capture this element instead of the
 *                        #prim-<SpecName> demo box; topbar: capture this
 *                        element within the card instead of its .check-bg
 *                        body; dashboard: capture this element instead of
 *                        the full page
 *   --fullpage           capture the whole viewport on BOTH sides
 *
 * Output: visual/__compare__/<story-id>--{ours,design}.png
 *
 * Notes:
 * - Requires a fresh `bun run build:storybook` (reads storybook-static/).
 * - auth/topbar/dashboard modes need network access when the design pages
 *   load React UMD + Babel standalone from a CDN.
 */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

import { chromium } from 'playwright';

const args = process.argv.slice(2);
// positionals always precede flags in documented usage
const positional = args.filter((a) => !a.startsWith('--'));
const [storyId, specName] = positional;
if (!storyId || !specName) {
  console.error('usage: node scripts/compare-design.mjs <story-id> <SpecName> [--source auth] [--theme dark] [--set key=value]…');
  process.exit(2);
}
const source = args.includes('--source') ? args[args.indexOf('--source') + 1] : 'bundle';
const theme = args.includes('--theme') ? args[args.indexOf('--theme') + 1] : 'light';
const selector = args.includes('--selector') ? args[args.indexOf('--selector') + 1] : null;
const fullpage = args.includes('--fullpage');
const sets = args
  .flatMap((a, i) => (a === '--set' ? [args[i + 1]] : []))
  .map((kv) => kv.split('='));

const SOURCES = {
  bundle: { dir: 'design/bundle', page: 'index.html' },
  auth: { dir: 'design/pages', page: 'auth.html' },
  topbar: { dir: 'design/pages', page: 'topbar.html' },
  // dashboard: whole-app design screens — the page itself is the positional
  // (usage.html, agents.html, …), validated after goto by the app mounting.
  dashboard: { dir: 'design/pages', page: null },
};
if (!SOURCES[source]) {
  console.error(`unknown --source "${source}" (bundle | auth | topbar | dashboard)`);
  process.exit(2);
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.jsx': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

function serve(dir, port) {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = join(dir, path === '/' ? 'index.html' : path);
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

const STORY_PORT = 6017;
const DESIGN_PORT = 6018;
const outDir = resolve('visual/__compare__');
await mkdir(outDir, { recursive: true });

const storyServer = await serve(resolve('storybook-static'), STORY_PORT);
const designServer = await serve(resolve(SOURCES[source].dir), DESIGN_PORT);
const browser = await chromium.launch();

try {
  // ---- ours: the Storybook story, tight-cropped to the rendered root ----
  const story = await browser.newPage();
  await story.goto(
    `http://127.0.0.1:${STORY_PORT}/iframe.html?id=${storyId}&viewMode=story`,
    { waitUntil: 'networkidle' },
  );
  await story.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  // The demo-box hatch, applied to OUR capture only (never to stories/
  // baselines — it's doc chrome): gives the side-by-side the same backdrop
  // so transparent surfaces and edges read identically on both sides.
  await story.evaluate(() => {
    document.body.style.background =
      'repeating-linear-gradient(45deg, var(--surface-sunk), var(--surface-sunk) 9px, transparent 9px, transparent 18px), var(--bg)';
  });
  await story.evaluate(() => document.fonts.ready);
  await story.waitForTimeout(250);
  const oursPath = join(outDir, `${storyId}--ours.png`);
  if (fullpage) {
    await story.screenshot({ path: oursPath, animations: 'disabled' });
  } else {
    await story.locator('#storybook-root').screenshot({ path: oursPath, animations: 'disabled' });
  }

  // ---- design side ----
  const design = await browser.newPage();
  await design.goto(
    `http://127.0.0.1:${DESIGN_PORT}/${SOURCES[source].page ?? specName}`,
    { waitUntil: 'networkidle' },
  );
  await design.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  const designPath = join(outDir, `${storyId}--design.png`);

  if (source === 'auth') {
    // Full-size artboards run taller than the default 720px viewport, which
    // leaves scrollIntoViewIfNeeded() unable to clear the sticky page header —
    // enlarge the viewport so the whole artboard fits without that fight.
    await design.setViewportSize({ width: 1280, height: 1800 });
    // Artboards: <section class="screen-card"> with the title in the header.
    // Babel-standalone compiles five JSX files first — allow a long wait.
    const artboard = design
      .locator('section.screen-card')
      .filter({ hasText: specName })
      .first();
    await artboard.waitFor({ timeout: 60_000 });
    await artboard.scrollIntoViewIfNeeded();
    // The screen renders inside a wrapper scaled to 0.85 — neutralize it so
    // the capture matches the story's full-size render.
    const wrapper = artboard.locator('.frame > div').first();
    await wrapper.evaluate((el) => {
      el.style.transform = 'none';
      el.style.width = '100%';
      el.style.marginBottom = '0';
    });
    // The page's sticky header is doc chrome, not design — same rationale as
    // bundle mode excluding its role-overlay legend from the capture.
    await design.evaluate(() => {
      const h = document.querySelector('header');
      if (h) h.style.display = 'none';
    });
    await design.evaluate(() => document.fonts.ready);
    await design.waitForTimeout(250);
    await wrapper.screenshot({ path: designPath, animations: 'disabled' });
  } else if (source === 'topbar') {
    // Showcase cards: <section> with the title in its header and the live
    // demo inside a .check-bg body (checkerboard = the page's own hatch
    // equivalent, so transparent edges read the same as in bundle mode).
    // Babel-standalone compiles four JSX files first — allow a long wait.
    await design.setViewportSize({ width: 1280, height: 1400 });
    const card = design
      .locator('section')
      .filter({ hasText: specName })
      .first();
    await card.waitFor({ timeout: 60_000 });
    await card.scrollIntoViewIfNeeded();
    // The page's sticky header is doc chrome, not design — hide it so it
    // can't bleed into scrolled captures (same rationale as auth mode).
    await design.evaluate(() => {
      const h = document.querySelector('header');
      if (h) h.style.display = 'none';
    });
    await design.evaluate(() => document.fonts.ready);
    await design.waitForTimeout(250);
    const demoBox = selector ? card.locator(selector).first() : card.locator('.check-bg').first();
    await demoBox.screenshot({ path: designPath, animations: 'disabled' });
  } else if (source === 'dashboard') {
    // Whole-app screens (usage.html, agents.html, …): no artboards to crop
    // to — capture the full mounted page, or --selector for a region.
    await design.setViewportSize({ width: 1280, height: 900 });
    await design.locator('#root > *').first().waitFor({ timeout: 60_000 });
    await design.evaluate(() => document.fonts.ready);
    await design.waitForTimeout(400);
    if (selector) {
      const region = design.locator(selector).first();
      await region.scrollIntoViewIfNeeded();
      await region.screenshot({ path: designPath, animations: 'disabled' });
    } else {
      await design.screenshot({ path: designPath, animations: 'disabled' });
    }
  } else {
    const section = design.locator(selector ?? `#prim-${specName}`);
    await section.waitFor({ timeout: 30_000 });
    await section.scrollIntoViewIfNeeded();

    for (const [key, value] of sets) {
      // Segmented controls render one button per variant value, labeled with it.
      await section.locator('button', { hasText: value }).first().click();
      await design.waitForTimeout(150);
    }

    await design.evaluate(() => document.fonts.ready);
    await design.waitForTimeout(250);
    if (fullpage) {
      await design.screenshot({ path: designPath, animations: 'disabled' });
    } else {
      const demoBox = selector
        ? section
        : section.locator('.prim-body > div:first-child > div:first-child');
      await demoBox.screenshot({ path: designPath, animations: 'disabled' });
    }
  }

  console.log(`ours:   ${oursPath}`);
  console.log(`design: ${designPath}`);
} finally {
  await browser.close();
  storyServer.close();
  designServer.close();
}
