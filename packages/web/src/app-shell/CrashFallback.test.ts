/**
 * @packageDocumentation
 * The offline probe `./CrashFallback.tsx`'s own documentation promises:
 * a static frame over `createElement`, read back as markup, with no
 * jsdom and no Playwright browser.
 *
 * ## Why a `.test.ts` can reach a `.tsx` at all
 *
 * `vitest.config.ts` collects `src/**` for `.test.ts` files only —
 * `.tsx` is outside that glob, by the two-runner discipline
 * `tests/README.md` states.
 * `CrashFallback` is therefore never unit-tested as a component in
 * the DOM-testing-library sense; it is read back as a string.
 * `react-dom/server`'s `renderToStaticMarkup` needs no `document`, no
 * `window` and no browser to run — it is a pure serialiser — so it
 * runs unmodified under this package's `environment: 'node'` vitest
 * project, which has none of those globals. That is the one thing
 * this file exists to have actually run rather than assumed: the
 * throwaway `zzProbeCrash.test.ts` probe recorded in
 * `.rafa/plans/CLOSEOUT-q20b-3-error-boundary-provider.md` took this
 * exact reading before this file replaced it, and the file/case
 * totals before and after this file lands are recorded there too.
 *
 * ## Why `renderToStaticMarkup` never exercises the boundary
 *
 * A throw inside a static render propagates straight to the caller —
 * `componentDidCatch` is a commit-phase hook, and a static render has
 * no commit phase to run it in. So this file never mounts
 * `AppErrorBoundary`; it renders `CrashFallback` directly with a
 * hand-built `Error` and a `reset` spy, exactly as
 * `./AppErrorBoundary.tsx`'s and `./CrashFallback.tsx`'s own
 * documentation say the colocated suite does. What `reset` and the
 * reload button's `window.location.reload()` actually DO belongs to
 * the forced Playwright spec, not to a case here — neither control is
 * clicked below, only read by name.
 *
 * ## Why the read is a regex over raw HTML, not a DOM query
 *
 * There is no `document` in this vitest project to parse markup
 * into, so each case reads the string `renderToStaticMarkup` answers
 * directly, per the `offline-react-render-probe` skill's guidance to
 * read the raw HTML rather than a stripped-text dump. Every button
 * `CrashFallback` draws carries no `aria-label` and no icon — its
 * accessible name IS its trimmed text content — so `buttonNames`
 * below is a correct, if component-specific, accessible-name reader
 * rather than a general one.
 *
 * ## Why the unpublished case runs first
 *
 * This package's law orders refusal cases before accepting ones in
 * every test file. The `devtools` topic unpublished is the refusal
 * shape here — no reporter is attached, so the fourth control must be
 * ABSENT — and it runs first; publishing `{installed: true}` and
 * reading the control's arrival runs second.
 *
 * `appSignals` is imported as the shared singleton on purpose: it is
 * the same instance `./CrashFallback.tsx` reads through
 * `readDevToolsInstalled`, and vitest isolates each test FILE's
 * module graph, so the publish in the second case here cannot leak
 * into any other file's reading of the same singleton.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { appSignals } from './appSignals';
import { CrashFallback } from './CrashFallback';

/** What happened, in one sentence — `./CrashFallback.tsx`'s heading. */
const HEADING = 'This page stopped working while it was rendering.';

/** The try-again control's accessible name. */
const TRY_AGAIN_NAME = 'Try again';

/** The reload control's accessible name. */
const RELOAD_NAME = 'Reload the page';

/** The report control's accessible name, drawn only while installed. */
const REPORT_NAME = 'Report this';

/**
 * One static frame of the fallback.
 *
 * A fresh `Error` and a fresh spy per call, so no case can observe a
 * `reset` call another case made — none of them click anything, but a
 * shared spy would still let one case's assertion read another's
 * history.
 *
 * @returns The markup `renderToStaticMarkup` answers for one frame.
 */
function markup(): string {
  return renderToStaticMarkup(
    createElement(CrashFallback, {
      error: new Error('crash-fallback-test: offline probe'),
      reset: vi.fn(),
    }),
  );
}

/**
 * Every `<button>` element's accessible name, in document order.
 *
 * Trimmed text content with any nested tags stripped stands in for
 * the accessible name here because none of `CrashFallback`'s buttons
 * carries an `aria-label` or an icon slot — the label IS the whole of
 * it. `\s\S` rather than `.` in the capture so a label that happened
 * to wrap would still be read as one name.
 *
 * @param html - A static-render frame.
 * @returns One name per `<button>...</button>` pair, in order.
 */
function buttonNames(html: string): string[] {
  return [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)]
    .map((match) => (match[1] ?? '').replace(/<[^>]*>/g, '').trim());
}

describe('CrashFallback, with no reporter attached', () => {
  it('draws the heading and the two always-on controls, with no report control', () => {
    const html = markup();
    const names = buttonNames(html);

    expect(html).toContain(HEADING);
    expect(names).toContain(TRY_AGAIN_NAME);
    expect(names).toContain(RELOAD_NAME);

    // The absence is read two ways: not a button by that name, and
    // not the string anywhere in the frame at all — the pairing the
    // `offline-react-render-probe` skill's "empty slice" trap warns
    // against a lone negative check for.
    expect(names).not.toContain(REPORT_NAME);
    expect(html).not.toContain(REPORT_NAME);
  });
});

describe('CrashFallback, with the devtools bridge installed', () => {
  it('draws the report control alongside the other two once devtools reads installed', () => {
    appSignals.publish('devtools', { installed: true });

    const html = markup();
    const names = buttonNames(html);

    expect(html).toContain(HEADING);
    expect(names).toContain(TRY_AGAIN_NAME);
    expect(names).toContain(RELOAD_NAME);
    expect(names).toContain(REPORT_NAME);
  });
});
