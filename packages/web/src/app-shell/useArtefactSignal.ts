/**
 * @packageDocumentation
 * Say which entity the current surface is about, for as long as it is
 * open.
 *
 * One hook, one effect, and nothing else. A modal sub-route calls
 * {@link useArtefactSignal} with its own word for what it edits and
 * the entity id its route carries; the `artefact` topic on
 * `./appSignals` then answers that record while the surface is
 * mounted and `null` once it is gone. Nothing is stored, nothing is
 * sent anywhere, and no component re-renders because of it: the hook
 * returns `void` and holds no state, so a surface that calls it
 * renders exactly as it did before.
 *
 * The payload is NOT built here. `artefactPayload` in `./appSignals`
 * is the one place "no artefact" is spelled — a blank kind or an
 * unresolved route parameter answers `null` there — so this module
 * decides WHEN to publish and that module decides WHAT. Keeping the
 * two apart is what lets the shaping rules carry colocated cases in a
 * suite this effect cannot reach; see the coverage note below.
 *
 * ## The lifecycle, exactly
 *
 * The effect's dependency list is both arguments, so:
 *
 * - On mount it publishes `artefactPayload(kind, id)` — a record, or
 *   `null` when the route parameter has not resolved yet.
 * - On a change of EITHER argument React runs the cleanup and then
 *   the effect again, so the channel sees `null` and then the new
 *   record. That momentary clear is deliberate rather than tolerated:
 *   a subscriber that renders the open artefact would otherwise carry
 *   one entity's id under another's kind for the width of a
 *   re-render, and `null` is a published fact the channel already
 *   distinguishes from "never published".
 * - On unmount it publishes `null`. A closed modal has no artefact,
 *   and a stale id left standing would attach the wrong entity to
 *   whatever a reporter captured next.
 *
 * `appSignals.publish` never throws, whatever its subscribers do, so
 * neither half of this effect can take down the surface that called
 * it.
 *
 * ## Two hooks mounted at once
 *
 * The topic carries ONE artefact, so two surfaces calling this at the
 * same time is last-writer-wins, and whichever unmounts first clears
 * it for both. That is not a case the shell can reach today — the
 * seven modal sub-routes are siblings and the router mounts one at a
 * time — and it is recorded rather than defended because the defence
 * (a stack, or a per-caller key) would be a mechanism with no caller.
 *
 * ## StrictMode
 *
 * `src/main.tsx` renders under `StrictMode`, which in development
 * mounts an effect, runs its cleanup and mounts it again. This one
 * survives that by being idempotent in both directions: the extra
 * pass publishes the same record, then `null`, then the same record
 * again, and the value the channel settles on is the one a single
 * pass would have left. Subscribers see three publishes rather than
 * one; none of them is wrong.
 *
 * ## Why there is no colocated case for the effect
 *
 * `packages/web/vitest.config.ts` is node-only and its include is a
 * recursive `.ts` glob over `src/` — `.ts` and not `.ts{,x}`, in a
 * `node` environment. The package has no jsdom and no DOM-testing
 * library (`package.json` carries neither), so nothing in that suite
 * can mount a component, change a prop or unmount one, which is all
 * three of the moments this module has.
 *
 * The one renderer that suite CAN reach is `react-dom/server`, which
 * the sibling `CrashFallback.test.ts` will static-render through when
 * it lands — and it is exactly the wrong instrument here, because
 * `renderToStaticMarkup` never runs an effect and never unmounts.
 * Measured rather than assumed: a throwaway `.test.ts` beside this
 * file static-rendering a component that calls
 * {@link useArtefactSignal} with `('probe', 'p-1')` answered
 * `appSignals.last('artefact')` `undefined`, while a direct
 * `publish` in the same file answered the record — the control that
 * says the reading could have failed. A colocated case would
 * therefore pass whatever this effect did, which is the one shape of
 * green worth refusing. That is the two-runner split
 * `tests/README.md` states, and this effect is on the browser side
 * of it.
 *
 * What CAN be pinned offline already is: `appSignals.test.ts` covers
 * `artefactPayload` — the `null` for a blank kind or a blank id, and
 * the record the `artefact` topic accepts — and covers publish,
 * `last` and the disposer this effect rides on. What is left for the
 * browser is the effect's timing, which is React's, and the three
 * publishes above.
 *
 * ## Which forced case covers it instead
 *
 * The forced Playwright spec `tests/e2e/dev-tools-boundary.spec.ts`,
 * run only by the `chromium-devtools` project against the forced
 * server on 5177 and ignored by the default project. Its case that
 * reads a published payload back through `page.evaluate` over
 * `devtoolsBus` — the same read its `route` case uses — is the one
 * that covers this hook: the bridge in `src/dev/` republishes
 * `artefact` onto that bus under the same name, so navigating into a
 * modal sub-route and reading the bus is the only place the mount
 * publish, the id change and the unmount clear are observable end to
 * end.
 *
 * That spec, the bridge and the seven calling modals all land in
 * LATER stages of the same plan as this file, and none of them exists
 * at the commit that adds it. So the paragraph above names the cover
 * rather than reports a green reading, and the task that writes the
 * forced spec owes it an artefact reading beside the `route` one. In
 * the meantime this hook has no caller, and the `artefact` topic
 * answers `undefined` for the whole life of the app.
 */

import { useEffect } from 'react';

import { appSignals, artefactPayload } from './appSignals';

/**
 * Publish which entity this surface is about while it is mounted.
 *
 * Call it once per surface, unconditionally, at the top of the
 * component — it is a hook, so it may not sit behind a branch, and
 * an id that has not resolved yet is a value to pass rather than a
 * reason to wait: `artefactPayload` turns it into the `null` the
 * channel already understands.
 *
 * @param kind - This surface's own word for what it edits, one
 * distinct string per modal sub-route. Blank publishes `null`.
 * @param id - The entity id the route carries, as `useParams`
 * answers it — `undefined` before it resolves, which publishes
 * `null`.
 */
export function useArtefactSignal(
  kind: string,
  id: string | null | undefined,
): void {
  useEffect(() => {
    // A subscription-shaped effect, not derived state: it writes to
    // something outside React and calls no setter, so it neither
    // cascades a render nor needs a value back.
    appSignals.publish('artefact', artefactPayload(kind, id));

    return () => {
      appSignals.publish('artefact', null);
    };
  }, [kind, id]);
}
