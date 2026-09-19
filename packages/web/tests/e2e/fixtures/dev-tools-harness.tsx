/**
 * @packageDocumentation
 * A test-only page for `../dev-tools-shell.spec.ts`, and nothing else.
 *
 * `startDevTools()` in `../../../src/dev/devtools.ts` mounts the widget
 * with `features: []` — this plan ships none, by its own header's own
 * words — so the real app never draws a modal or a drawer. The forced
 * spec's fixed case list still has to prove "a modal traps focus", "a
 * drawer leaves the page interactive", "a second drawer item closes the
 * first" and "the handle collapses and expands", and none of those is
 * reachable against the shipped configuration. This file is what makes
 * them reachable: it is not imported by the app and not requested by
 * anything but this fixture's own `dev-tools-harness.html`, which
 * `chromium-devtools`'s own server (`playwright.config.ts`, port 5177,
 * `VITE_DEVTOOLS_FORCE=1`) serves like any other page under this
 * package's root — Vite needs no extra config to transform an HTML file
 * that is not `index.html`, and no code path in `@ar/web`'s production
 * build references either file here, so neither reaches `dist/`.
 *
 * `mountDevTools` is called with ONE feature, contributing the three
 * surfaces the case list needs and nothing the app does not already
 * offer elsewhere: a `mode: 'modal'` item to trap focus and close on
 * Escape, and two `mode: 'drawer'` items — one with `handle: true` so
 * the collapse/expand case has something to collapse, the other with
 * none — so opening the second is what proves the shell's one
 * `openSurface` slot closes the first (decision 6 of
 * `.rafa/specs/q20b-1-dev-tools-shell.md`; `../../../src/core/Shell.tsx`
 * is the wiring the spec drives here).
 *
 * `#app-button` is the only thing on the page besides the widget's own
 * root. A drawer is required to leave the page interactive behind it —
 * `../../../src/core/surfaces/Drawer.tsx`'s header says so and gates no
 * pointer event to prove it — so the spec's drawer case clicks this
 * button while the drawer is open and reads the incremented count back,
 * which a modal's `showModal()` would have refused by making the whole
 * document inert.
 *
 * `VITE_DEVTOOLS_FORCE=1` on the 5177 server is what lets the widget
 * mount here at all: `navigator.webdriver` is `true` under Playwright,
 * and `@ar/dev-tools`'s own automation guard
 * (`packages/dev-tools/src/core/mount.ts`) refuses to draw anything
 * without the override — the same guard the real app relies on to stay
 * out of the default suite and the visual baselines.
 *
 * No `version` is passed to {@link mountDevTools}: `config.version` is
 * read from a plain `__DEVTOOLS_COMMIT__`-style identifier
 * `devtoolsPlugin()`'s `config()` hook defines, and this repository's
 * pinned `vite@8.3.0` does not fold a plain `define` key into a `.ts`
 * or `.tsx` module's transform under `vite dev` — measured directly
 * against this server: a scratch file reading `typeof
 * __DEVTOOLS_COMMIT__` came back with the identifier untouched, and the
 * same held for `../../../src/dev/devtools.ts` itself. Nothing here
 * depends on that path: `packages/dev-tools/src/core/host.ts`'s
 * `pickVersion` already falls back to `GET /__devtools/status` — a
 * plain HTTP handler `configureServer` installs, unaffected by the
 * define bug — whenever the config says nothing, so the About case
 * below reads a real commit either way. Recorded as a bug outside this
 * task's scope rather than fixed here.
 */

import type { DevToolsFeature, MenuItem } from '@ar/dev-tools';
import type { ReactElement } from 'react';

import { mountDevTools } from '@ar/dev-tools';

import '@ar/dev-tools/styles.css';

/** The plain page control the drawer case proves is still clickable. */
const APP_BUTTON_ID = 'app-button';

/** Where the click count is written back, for the spec to read. */
const APP_BUTTON_COUNT_ID = 'app-button-count';

const appButton = document.getElementById(APP_BUTTON_ID);
const appButtonCount = document.getElementById(APP_BUTTON_COUNT_ID);
let appButtonClicks = 0;

appButton?.addEventListener('click', () => {
  appButtonClicks += 1;

  if (appButtonCount !== null) {
    appButtonCount.textContent = String(appButtonClicks);
  }
});

/** The modal item's body: two focusable controls, to prove the trap. */
export function SessionModal({ close }: { close: () => void }): ReactElement {
  return (
    <>
      <h2>Session</h2>
      <button type="button">Do a thing</button>
      <button type="button" onClick={close}>Close</button>
    </>
  );
}

/** A drawer item's body. Nothing it needs to do beyond being findable. */
export function DrawerBody({ label }: { label: string }): ReactElement {
  return <p>{label} body</p>;
}

/** The one feature this harness configures, contributing three items. */
const harnessFeature: DevToolsFeature = {
  id: 'harness',
  label: 'Harness',
  items: (): readonly MenuItem[] => [
    {
      id: 'session',
      label: 'Session',
      mode: 'modal',
      render: ({ close }) => <SessionModal close={close} />,
    },
    {
      id: 'primary-drawer',
      label: 'Primary drawer',
      mode: 'drawer',
      handle: true,
      render: () => <DrawerBody label="Primary drawer" />,
    },
    {
      id: 'secondary-drawer',
      label: 'Secondary drawer',
      mode: 'drawer',
      render: () => <DrawerBody label="Secondary drawer" />,
    },
  ],
};

mountDevTools({
  // The real app's own default — see `../../../src/dev/devtools.ts` —
  // so the corner case reads the same value a reader of that file
  // would expect "the configured corner" to mean.
  corner: 'bottom-right',
  features: [harnessFeature],
});
