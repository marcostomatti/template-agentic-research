/**
 * @packageDocumentation
 * What the app shows once `./AppErrorBoundary.tsx` has caught: one
 * sentence saying what happened, the failure in the words it was
 * thrown with, and the ways out.
 *
 * This file imports `react`, `@ar/ui` and `./appSignals` and nothing
 * else. It is reached from `src/main.tsx` in a PRODUCTION build — it
 * is the fallback that file hands the boundary — so the rule the
 * boundary is held to is held here for the same reason: `@ar/web`
 * takes `@ar/dev-tools` as a devDependency, the Docker `web` stage
 * holds its manifest and no `dist/`, and a production module that
 * imported it would fail the image build.
 *
 * ## Four controls, and why they are ONE component
 *
 * Three things are drawn in every build — the sentence saying what
 * happened, a try-again button and a reload button — and a fourth,
 * "report this", only while a reporter is attached to the tab. The
 * production screen is those three; the development screen is the
 * same three with the fourth beside them. The obvious alternative is
 * two components, a production one and a development one, chosen by
 * `import.meta.env.DEV`. It is wrong in four separate ways:
 *
 * - **The condition is not "is this a development build".** It is
 *   "is a reporter attached to this tab right now", and the two
 *   come apart in builds this repo already runs. Both Playwright
 *   servers in `packages/web/playwright.config.ts` are `vite` dev
 *   servers, so `import.meta.env.DEV` is true on both — and the
 *   widget mounts on only ONE of them, `mount.ts` suppressing it
 *   under `navigator.webdriver` unless the 5177 server's
 *   `VITE_DEVTOOLS_FORCE=1` turns it back on. A build-mode check
 *   would therefore draw a "report this" button on the default
 *   server with no bridge behind it to hear the publish, which is
 *   the one reading the default suite is there to take.
 * - **Nothing production-side could select the development half.**
 *   The only module that picks a fallback is `src/main.tsx`, which
 *   is production code: a dev-only fallback it imported statically
 *   would drag whatever that file reaches into the bundle, and a
 *   dev-only fallback that reaches NOTHING extra is this same file
 *   written twice.
 * - **The fourth control costs production one `false`.** The
 *   `devtools` topic has exactly one publisher — the bridge in
 *   `src/dev/`, which production never loads — so the button's
 *   absence from a production build is guaranteed by there being no
 *   publisher, which a bundle reading can check, rather than by a
 *   build flag, which it cannot.
 * - **One component keeps the production controls on the tested
 *   path.** The markup an operator meets after a crash in production
 *   is the same markup every reading here is taken against, with the
 *   extra control as one conditional branch inside it, rather than a
 *   second file that nobody opens until a QA round goes wrong.
 *
 * ## The `devtools` signal is SUBSCRIBED, never read once
 *
 * `src/main.tsx` reaches the bridge through an
 * `import.meta.env.DEV` DYNAMIC import, so the bridge installs on a
 * later microtask than the first render. A fallback that read
 * `appSignals.last('devtools')` once during render and kept the
 * answer would therefore be permanently wrong for every mount that
 * happened first — and wrong again in the other direction when the
 * bridge's disposer publishes `{installed: false}`.
 *
 * {@link https://react.dev/reference/react/useSyncExternalStore |
 * useSyncExternalStore} IS that subscription: {@link subscribeDevTools}
 * registers on the topic, {@link readDevToolsInstalled} reads `last`,
 * and React re-reads the snapshot after subscribing — which closes
 * the window between the render and the subscription that a
 * `useState` seeded from `last` plus a `useEffect` would leave open.
 *
 * Its THIRD argument is load-bearing rather than ceremonial. The node
 * unit suite's only renderer is `react-dom/server`, and
 * `renderToStaticMarkup` of a component calling
 * `useSyncExternalStore` with two arguments throws `Missing
 * getServerSnapshot, which is required for server-rendered content`
 * — measured, by deleting that argument and re-running a throwaway
 * static-render probe, which reds both of its cases; the
 * three-argument form passed that probe either side of the deletion,
 * and the file was restored byte-identical (`shasum -a 256`
 * compared). The server reader is the SAME function as the
 * client one on purpose: this app never server-renders, the only
 * caller of that argument is the offline probe, and the channel it
 * reads is one in-memory map in both places.
 *
 * ## What it is drawn with
 *
 * `Content`, `Banner` and `Button` from `@ar/ui`; `main`, `h1` and
 * `p` as plain elements, because the library ships no heading and the
 * app-local `PageHead` is shell-shaped — and the shell is exactly
 * what is gone. The panel is design tokens on a `Content`, which is
 * how `src/routes/login/LoginPage.tsx` and
 * `src/routes/login/AuthGate.tsx` draw themselves: they are the other
 * two screens in this app that render with no chrome around them.
 *
 * Two near-misses, both rejected for stated reasons:
 *
 * - `Card`. `packages/web/context/components.md` records that it is
 *   imported nowhere under `src/`, card surfaces having been refitted
 *   onto `EntityCard`; a one-off panel is not the thing to make that
 *   sentence false for.
 * - `EmptyState`, which `src/routes/DomainGuard.tsx` uses for its own
 *   shell-less refusal. It renders its title as a `span`, so the one
 *   screen that REPLACES the app's only `h1` would carry no heading
 *   at all; its description is capped at 240px, narrower than most
 *   thrown messages; and it always draws `TomatoMark`, which would
 *   put a second tomato on the one screen whose development reading
 *   is that the widget's tomato is still standing.
 *
 * `role="alert"` sits on the `Banner` and nowhere else, which is what
 * every other danger banner in this app does. The fallback replaces a
 * tree in a document that is already live, so the region genuinely is
 * a change rather than page content born with the screen — the
 * distinction `AuthGate`'s pending screen makes in the other
 * direction.
 *
 * ## The failure line, and what it leaves out
 *
 * The boundary hands over the thrown value itself, and both sides
 * reduce it through the same pure `errorPayload`: the line on the
 * screen and the line a filed report carries are built by one
 * function from one error, so they cannot disagree. Nothing is capped
 * here — the consumer that quotes this into an issue body caps it at
 * that edge, where the cap and its ellipsis already live.
 *
 * `topFrame` and `componentStack` are deliberately NOT drawn. A stack
 * is for whoever reads the report, it is already on the channel for
 * them, and an operator reading a crash screen has no use for it. An
 * `Error` thrown with an empty message draws its name alone, which is
 * the whole of what was thrown; there is no branch for that case
 * because there is nothing else to say.
 *
 * ## What the colocated suite can reach
 *
 * `packages/web/vitest.config.ts` is node-only and collects `.ts`
 * alone, so this `.tsx` is reachable only through a static render
 * over `createElement` — which is what the sibling
 * `CrashFallback.test.ts` does when it lands in this plan: the
 * heading and the two always-drawn control names with the `devtools`
 * topic unpublished and no "report this" among them, then the same
 * render with it published as installed carrying it.
 *
 * `renderToStaticMarkup` runs no effect and dispatches no event, so
 * what `reset`, the reload and the `open-feedback` publish actually
 * DO belongs to the forced Playwright spec and to nothing here.
 */

import { Banner, Button, Content } from '@ar/ui';
import { useSyncExternalStore } from 'react';

import { appSignals, errorPayload } from './appSignals';

/** The label above the heading, in the house standalone-screen shape. */
const EYEBROW = 'Render error';

/** What happened, in one sentence. */
const HEADING = 'This page stopped working while it was rendering.';

/** What the two always-drawn controls are for, in one sentence. */
const STANDFIRST =
  'Everything else is still loaded, so try again first; reload only if '
  + 'it keeps failing.';

/** Re-render the children the boundary is holding back. */
const TRY_AGAIN_LABEL = 'Try again';

/** Throw the tab away and start the app cold. */
const RELOAD_LABEL = 'Reload the page';

/** Ask whatever reporter is attached to open on this failure. */
const REPORT_LABEL = 'Report this';

/**
 * Listen for the bridge installing or going away.
 *
 * Module scope so the function value is stable across renders:
 * `useSyncExternalStore` re-subscribes whenever this argument
 * changes, and one defined inside the component changes every time.
 *
 * @param onStoreChange - React's callback, handed the payload and
 * ignoring it.
 * @returns The channel's disposer, which is idempotent.
 */
function subscribeDevTools(onStoreChange: () => void): () => void {
  return appSignals.subscribe('devtools', onStoreChange);
}

/**
 * Whether a reporter is attached right now.
 *
 * A boolean rather than the payload, so React compares snapshots by
 * value and a re-publish of the same state re-renders nothing.
 * Doubles as the server reader — see this module's documentation.
 *
 * @returns `true` only while the bridge has said so.
 */
function readDevToolsInstalled(): boolean {
  return appSignals.last('devtools')?.installed === true;
}

/** Start the app cold, discarding everything this tab holds. */
function reloadPage(): void {
  window.location.reload();
}

/**
 * Ask for the feedback surface.
 *
 * The app names no feature id and no item id: `open-feedback` carries
 * nothing, and turning it into the widget's `open-item` is the
 * bridge's job with the package's own constants.
 */
function openFeedback(): void {
  appSignals.publish('open-feedback');
}

/** What the boundary hands its fallback. */
export interface CrashFallbackProps {
  /**
   * Whatever was thrown. Any value at all — a `throw` takes one — so
   * it is reduced through `errorPayload` rather than read directly.
   */
  readonly error: unknown;

  /**
   * Re-render the children the boundary caught in.
   *
   * Bound to the try-again control, and the reason that control is
   * the primary one: the boundary sits BELOW the query cache, so a
   * reset re-renders the page against everything the tab already
   * read rather than starting it cold.
   */
  readonly reset: () => void;
}

/**
 * The screen a caught render failure leaves standing.
 *
 * @param props - The thrown value and the boundary's reset.
 * @returns The fallback, with three controls or four.
 */
export const CrashFallback = ({ error, reset }: CrashFallbackProps) => {
  const isReporterInstalled = useSyncExternalStore(
    subscribeDevTools,
    readDevToolsInstalled,
    readDevToolsInstalled,
  );
  const failure = errorPayload(error);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-sunk px-6 py-14">
      <Content
        gap="lg"
        className="w-full max-w-[520px] rounded-xl border border-border-soft bg-surface-1 p-8 shadow-sm"
      >
        <Content gap="sm">
          <p className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-fg3">
            {EYEBROW}
          </p>
          {/* The standalone-screen heading treatment `LoginPage`
              states, plus `m-0`: `tokens.css` gives a bare `h1` a
              60px size and a 24px bottom margin, which is the right
              answer for a heading alone on a page and the wrong one
              inside a panel whose vertical rhythm is the parent's
              flex gap. */}
          <h1 className="m-0 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-fg1">
            {HEADING}
          </h1>
          <p className="m-0 text-sm leading-normal text-fg2">{STANDFIRST}</p>
        </Content>

        <Banner role="alert" tone="danger" title={failure.name}>
          <span className="break-words">{failure.message}</span>
        </Banner>

        <Content direction="row" gap="sm" wrap>
          <Button onClick={reset}>{TRY_AGAIN_LABEL}</Button>
          <Button variant="secondary" onClick={reloadPage}>
            {RELOAD_LABEL}
          </Button>
          {isReporterInstalled && (
            <Button variant="ghost" onClick={openFeedback}>
              {REPORT_LABEL}
            </Button>
          )}
        </Content>
      </Content>
    </main>
  );
};
